import { createClient } from "@/lib/supabase/server";
import type {
  AdminEntitiesResponse,
  AdminEntityCapability,
  AdminEntityKey,
  AdminEntitySummary,
  AdminFieldConfig,
  AdminItemResponse,
  AdminListResponse,
  AdminLookupOption,
  AdminSettingsRecord,
} from "@/lib/admin/types";
import { resolveIdempotencyKey } from "@/backend/realtime/idempotency";
import { publishRealtimeEvent } from "@/backend/realtime/service";
import {
  ADMIN_REALTIME_FEED,
  ADMIN_SETTINGS_SINGLETON_ID,
  createDefaultAdminSettingsRecord,
  getImamRealtimeFeed,
  normalizeAdminSettingsRecord,
  resolveManagementRealtimeFeed,
} from "./defaults";
import {
  AdminAuthorizationError,
  type AdminSession,
  assertEntityAction,
  buildEntityCapability,
} from "./auth";
import {
  getAdminEntityDefinition,
  listAdminEntityDefinitions,
  type AdminEntityDefinition,
} from "./entities";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export class AdminServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminServiceError";
    this.status = status;
  }
}

const PROFILE_ROLE_ORDER = [
  "member",
  "imam",
  "shura",
  "admin",
  "super_admin",
] as const;

type ManagedProfileRole = (typeof PROFILE_ROLE_ORDER)[number];
const EMPTY_IMAM_SCOPE_UUID = "00000000-0000-0000-0000-000000000000";

const IMAM_MOSQUE_SCOPED_ENTITY_KEYS = new Set<AdminEntityKey>([
  "mosques",
  "prayer_times",
  "events",
  "announcements",
  "imams",
  "imam_appointments",
  "management_teams",
  "management_team_members",
  "mosque_tasks",
  "donations",
  "posts",
  "profiles",
]);

function isManagedProfileRole(value: unknown): value is ManagedProfileRole {
  return (
    value === "member" ||
    value === "imam" ||
    value === "shura" ||
    value === "admin" ||
    value === "super_admin"
  );
}

function getProfileRoleLevel(role: ManagedProfileRole): number {
  return PROFILE_ROLE_ORDER.indexOf(role);
}

function assertImamHasMosque(session: AdminSession): string {
  if (!session.mosqueId) {
    throw new AdminAuthorizationError(
      "Your imam account does not have an active mosque appointment yet.",
      403
    );
  }

  return session.mosqueId;
}

function getImamScopeColumn(
  definition: AdminEntityDefinition
): string | null {
  if (!IMAM_MOSQUE_SCOPED_ENTITY_KEYS.has(definition.key)) {
    return null;
  }

  return definition.key === "mosques" ? definition.primaryKey : "mosque_id";
}

function getScopedMosqueIdForSession(
  definition: AdminEntityDefinition,
  session: AdminSession
): string | null {
  if (session.role !== "imam") {
    return null;
  }

  return getImamScopeColumn(definition) ? session.mosqueId : null;
}

function applySessionScopeToQuery(
  query: {
    eq: (column: string, value: unknown) => unknown;
  },
  definition: AdminEntityDefinition,
  session: AdminSession
): any {
  if (session.role !== "imam") {
    return query;
  }

  const scopeColumn = getImamScopeColumn(definition);
  if (!scopeColumn) {
    return query;
  }

  return query.eq(scopeColumn, session.mosqueId ?? EMPTY_IMAM_SCOPE_UUID);
}

function resolveRecordMosqueId(
  definition: AdminEntityDefinition,
  record: Record<string, unknown> | null | undefined
): string | null {
  if (!record) {
    return null;
  }

  if (definition.key === "mosques") {
    return typeof record[definition.primaryKey] === "string"
      ? String(record[definition.primaryKey])
      : null;
  }

  const mosqueId = record.mosque_id;
  return typeof mosqueId === "string" ? mosqueId : null;
}

async function assertRecordWithinSessionScope(input: {
  supabase: SupabaseServerClient;
  definition: AdminEntityDefinition;
  session: AdminSession;
  record: Record<string, unknown>;
}): Promise<string | null> {
  if (input.session.role !== "imam") {
    return resolveRecordMosqueId(input.definition, input.record);
  }

  if (input.definition.key === "imams") {
    const mosqueId = assertImamHasMosque(input.session);
    const imamId = normalizeIdentifier(input.record.id);

    if (!imamId) {
      throw new AdminAuthorizationError("Forbidden", 403);
    }

    const scopedImamIds = await loadImamIdsForMosque(input.supabase, mosqueId);
    if (!scopedImamIds.includes(imamId)) {
      throw new AdminAuthorizationError("Forbidden", 403);
    }

    return mosqueId;
  }

  const scopeColumn = getImamScopeColumn(input.definition);
  if (!scopeColumn) {
    throw new AdminAuthorizationError("Forbidden", 403);
  }

  const mosqueId = assertImamHasMosque(input.session);
  const recordMosqueId = resolveRecordMosqueId(input.definition, input.record);

  if (recordMosqueId !== mosqueId) {
    throw new AdminAuthorizationError("Forbidden", 403);
  }

  return recordMosqueId;
}

function applySessionScopeToMutationPayload(
  definition: AdminEntityDefinition,
  payload: Record<string, unknown>,
  session: AdminSession
): Record<string, unknown> {
  if (session.role !== "imam") {
    return payload;
  }

  const mosqueId = assertImamHasMosque(session);

  switch (definition.key) {
    case "mosques": {
      const nextPayload = { ...payload };
      delete nextPayload.is_verified;
      return nextPayload;
    }
    case "prayer_times":
    case "events":
    case "announcements":
    case "imams":
    case "management_teams":
    case "mosque_tasks":
    case "donations":
    case "posts":
    case "profiles":
      return {
        ...payload,
        mosque_id: mosqueId,
      };
    default:
      return payload;
  }
}

function assertCanManageProfileMutation(input: {
  session: AdminSession;
  targetProfile: Record<string, unknown>;
  payload?: Record<string, unknown>;
}): void {
  const currentRole = input.session.role;
  const targetRole = isManagedProfileRole(input.targetProfile.role)
    ? input.targetProfile.role
    : "member";
  const targetUserId =
    typeof input.targetProfile.id === "string" ? input.targetProfile.id : null;
  const nextRole = isManagedProfileRole(input.payload?.role)
    ? input.payload.role
    : undefined;

  if (!targetUserId) {
    throw new AdminServiceError("Profile not found", 404);
  }

  if (targetUserId === input.session.userId && nextRole && nextRole !== targetRole) {
    throw new AdminServiceError("You cannot change your own role", 403);
  }

  if (currentRole !== "super_admin" && currentRole !== "admin") {
    throw new AdminServiceError("Forbidden", 403);
  }

  if (targetRole === "super_admin" && currentRole !== "super_admin") {
    throw new AdminServiceError("Only super admins can manage super admins", 403);
  }

  if (currentRole === "admin" && getProfileRoleLevel(targetRole) >= getProfileRoleLevel("admin")) {
    throw new AdminServiceError("Admins can only manage users below admin", 403);
  }

  if (nextRole === "super_admin" && currentRole !== "super_admin") {
    throw new AdminServiceError("Only super admins can assign super admin", 403);
  }

  if (nextRole && currentRole === "admin" && getProfileRoleLevel(nextRole) >= getProfileRoleLevel("admin")) {
    throw new AdminServiceError("Admins can only assign roles below admin", 403);
  }
}

function parseFilterValue(field: AdminFieldConfig, rawValue: string): unknown {
  if (field.type === "boolean") {
    return rawValue === "true";
  }

  if (field.type === "number") {
    const numeric = Number(rawValue);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return rawValue;
}

async function loadExistingProfileRecord(
  supabase: SupabaseServerClient,
  profileId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Profile not found", 404);
  }

  return data as Record<string, unknown>;
}

async function loadExistingEntityRecord(
  supabase: SupabaseServerClient,
  definition: AdminEntityDefinition,
  id: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from(definition.table)
    .select("*")
    .eq(definition.primaryKey, id)
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Record not found", 404);
  }

  return data as Record<string, unknown>;
}

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const nextValue = value.trim();
  return nextValue.length > 0 ? nextValue : null;
}

async function loadImamIdsForMosque(
  supabase: SupabaseServerClient,
  mosqueId: string
): Promise<string[]> {
  const imamIds = new Set<string>();

  const { data: directImams, error: directImamsError } = await supabase
    .from("imams")
    .select("id")
    .eq("mosque_id", mosqueId);

  if (directImamsError) {
    throw new AdminServiceError(directImamsError.message, 500);
  }

  for (const row of directImams ?? []) {
    imamIds.add(String(row.id));
  }

  const { data: appointmentRows, error: appointmentsError } = await supabase
    .from("imam_appointments")
    .select("imam_id")
    .eq("mosque_id", mosqueId);

  if (appointmentsError) {
    if (isMissingRelationError(appointmentsError)) {
      return Array.from(imamIds);
    }

    throw new AdminServiceError(appointmentsError.message, 500);
  }

  for (const row of appointmentRows ?? []) {
    const imamId = normalizeIdentifier(row.imam_id);
    if (imamId) {
      imamIds.add(imamId);
    }
  }

  return Array.from(imamIds);
}

async function loadImamIdsForProfile(
  supabase: SupabaseServerClient,
  profileId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("imams")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_active", true);

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  return (data ?? []).map((row) => String(row.id));
}

async function loadPrimaryImamAppointment(
  supabase: SupabaseServerClient,
  imamId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("imam_appointments")
    .select("id, imam_id, mosque_id, appointed_date, is_primary, is_active, updated_at")
    .eq("imam_id", imamId)
    .order("is_active", { ascending: false })
    .order("is_primary", { ascending: false })
    .order("appointed_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw new AdminServiceError(error.message, 500);
  }

  return (data as Record<string, unknown> | null) ?? null;
}

async function syncImamRecordPrimaryAssignment(
  supabase: SupabaseServerClient,
  imamId: string
): Promise<void> {
  const primaryAppointment = await loadPrimaryImamAppointment(supabase, imamId);
  const primaryMosqueId = normalizeIdentifier(primaryAppointment?.mosque_id);
  const appointedDate =
    typeof primaryAppointment?.appointed_date === "string"
      ? primaryAppointment.appointed_date
      : null;

  const { error } = await supabase
    .from("imams")
    .update({
      mosque_id: primaryMosqueId,
      appointed_date: appointedDate,
    })
    .eq("id", imamId);

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }
}

async function syncImamAppointmentFromImamRecord(input: {
  supabase: SupabaseServerClient;
  imamRecord: Record<string, unknown>;
  session: AdminSession;
}): Promise<void> {
  const imamId = normalizeIdentifier(input.imamRecord.id);
  if (!imamId) {
    return;
  }

  const mosqueId = normalizeIdentifier(input.imamRecord.mosque_id);

  if (!mosqueId) {
    const { error } = await input.supabase
      .from("imam_appointments")
      .update({
        is_primary: false,
        updated_by: input.session.userId,
      })
      .eq("imam_id", imamId);

    if (error && !isMissingRelationError(error)) {
      throw new AdminServiceError(error.message, 500);
    }

    return;
  }

  const { error: clearPrimaryError } = await input.supabase
    .from("imam_appointments")
    .update({
      is_primary: false,
      updated_by: input.session.userId,
    })
    .eq("imam_id", imamId)
    .neq("mosque_id", mosqueId);

  if (clearPrimaryError && !isMissingRelationError(clearPrimaryError)) {
    throw new AdminServiceError(clearPrimaryError.message, 500);
  }

  const appointmentPayload = {
    imam_id: imamId,
    mosque_id: mosqueId,
    role_title:
      typeof input.imamRecord.title === "string" ? input.imamRecord.title : null,
    appointed_date:
      typeof input.imamRecord.appointed_date === "string"
        ? input.imamRecord.appointed_date
        : null,
    is_primary: true,
    is_active: Boolean(input.imamRecord.is_active),
    updated_by: input.session.userId,
    created_by: input.session.userId,
  };

  const { error: upsertError } = await input.supabase
    .from("imam_appointments")
    .upsert(appointmentPayload, {
      onConflict: "imam_id,mosque_id",
    });

  if (upsertError) {
    if (isMissingRelationError(upsertError)) {
      return;
    }

    throw new AdminServiceError(upsertError.message, 500);
  }
}

async function loadManagementTeamRecord(
  supabase: SupabaseServerClient,
  teamId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("management_teams")
    .select("id, mosque_id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Management team not found", 404);
  }

  return data as Record<string, unknown>;
}

async function assertProfileBelongsToMosque(input: {
  supabase: SupabaseServerClient;
  profileId: string;
  mosqueId: string;
  label: string;
  enforceMosqueMatch?: boolean;
}): Promise<void> {
  const { data: profile, error } = await input.supabase
    .from("profiles")
    .select("id, mosque_id")
    .eq("id", input.profileId)
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!profile) {
    throw new AdminServiceError(`${input.label} profile was not found`, 400);
  }

  if (!input.enforceMosqueMatch) {
    return;
  }

  if (profile?.mosque_id === input.mosqueId) {
    return;
  }

  const imamIds = await loadImamIdsForProfile(input.supabase, input.profileId);

  if (!imamIds.length) {
    throw new AdminServiceError(
      `${input.label} must belong to the same mosque`,
      400
    );
  }

  const { data: directImamAssignment, error: directImamError } = await input.supabase
    .from("imams")
    .select("id")
    .eq("profile_id", input.profileId)
    .eq("mosque_id", input.mosqueId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (directImamError) {
    throw new AdminServiceError(directImamError.message, 500);
  }

  if (directImamAssignment) {
    return;
  }

  const { data: imamAppointment, error: imamAppointmentError } = await input.supabase
    .from("imam_appointments")
    .select("id")
    .in("imam_id", imamIds)
    .eq("mosque_id", input.mosqueId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (imamAppointmentError) {
    if (isMissingRelationError(imamAppointmentError)) {
      throw new AdminServiceError(
        `${input.label} must belong to the same mosque`,
        400
      );
    }

    throw new AdminServiceError(imamAppointmentError.message, 500);
  }

  if (!imamAppointment) {
    throw new AdminServiceError(
      `${input.label} must belong to the same mosque`,
      400
    );
  }
}

async function applyRelationalIntegrityToMutationPayload(input: {
  supabase: SupabaseServerClient;
  definition: AdminEntityDefinition;
  payload: Record<string, unknown>;
  session: AdminSession;
  existingRecord?: Record<string, unknown> | null;
}): Promise<Record<string, unknown>> {
  const nextPayload = { ...input.payload };

  switch (input.definition.key) {
    case "imams": {
      const hasExplicitMosqueSelection = Object.prototype.hasOwnProperty.call(
        nextPayload,
        "mosque_id"
      );
      const mosqueId = hasExplicitMosqueSelection
        ? normalizeIdentifier(nextPayload.mosque_id) ??
          (input.session.role === "imam" ? assertImamHasMosque(input.session) : null)
        : normalizeIdentifier(input.existingRecord?.mosque_id) ??
          getScopedMosqueIdForSession(input.definition, input.session) ??
          (input.session.role === "imam" ? assertImamHasMosque(input.session) : null);
      nextPayload.mosque_id = mosqueId;

      if (input.session.role === "imam" && mosqueId !== assertImamHasMosque(input.session)) {
        throw new AdminAuthorizationError(
          "You can only manage imam records for your appointed mosque",
          403
        );
      }

      const profileId = normalizeIdentifier(nextPayload.profile_id);
      if (profileId && mosqueId) {
        await assertProfileBelongsToMosque({
          supabase: input.supabase,
          profileId,
          mosqueId,
          label: "Linked imam profile",
          enforceMosqueMatch: input.session.role === "imam",
        });
      }

      return nextPayload;
    }
    case "imam_appointments": {
      const imamId =
        normalizeIdentifier(nextPayload.imam_id) ??
        normalizeIdentifier(input.existingRecord?.imam_id);
      const mosqueId =
        normalizeIdentifier(nextPayload.mosque_id) ??
        normalizeIdentifier(input.existingRecord?.mosque_id) ??
        getScopedMosqueIdForSession(input.definition, input.session);

      if (!imamId) {
        throw new AdminServiceError("An imam appointment must reference an imam", 400);
      }

      if (!mosqueId) {
        throw new AdminServiceError("An imam appointment must reference a mosque", 400);
      }

      if (input.session.role === "imam" && mosqueId !== assertImamHasMosque(input.session)) {
        throw new AdminAuthorizationError(
          "You can only manage appointments for your appointed mosque",
          403
        );
      }

      nextPayload.imam_id = imamId;
      nextPayload.mosque_id = mosqueId;

      return nextPayload;
    }
    case "management_teams": {
      const mosqueId =
        normalizeIdentifier(nextPayload.mosque_id) ??
        normalizeIdentifier(input.existingRecord?.mosque_id) ??
        getScopedMosqueIdForSession(input.definition, input.session) ??
        (input.session.role === "imam" ? assertImamHasMosque(input.session) : null);

      if (!mosqueId) {
        throw new AdminServiceError("Management teams must belong to a mosque", 400);
      }

      if (input.session.role === "imam" && mosqueId !== assertImamHasMosque(input.session)) {
        throw new AdminAuthorizationError("You can only manage teams for your appointed mosque", 403);
      }

      nextPayload.mosque_id = mosqueId;

      const leadProfileId = normalizeIdentifier(nextPayload.lead_profile_id);
      if (leadProfileId) {
        await assertProfileBelongsToMosque({
          supabase: input.supabase,
          profileId: leadProfileId,
          mosqueId,
          label: "Team lead",
          enforceMosqueMatch: input.session.role === "imam",
        });
      }

      return nextPayload;
    }
    case "management_team_members": {
      const teamId =
        normalizeIdentifier(nextPayload.team_id) ??
        normalizeIdentifier(input.existingRecord?.team_id);

      if (!teamId) {
        throw new AdminServiceError("A team member must be assigned to a management team", 400);
      }

      const teamRecord = await loadManagementTeamRecord(input.supabase, teamId);
      const mosqueId = normalizeIdentifier(teamRecord.mosque_id);

      if (!mosqueId) {
        throw new AdminServiceError("The selected management team is not linked to a mosque", 400);
      }

      if (input.session.role === "imam" && mosqueId !== assertImamHasMosque(input.session)) {
        throw new AdminAuthorizationError("You can only manage members for your appointed mosque", 403);
      }

      nextPayload.team_id = teamId;
      nextPayload.mosque_id = mosqueId;

      const profileId = normalizeIdentifier(nextPayload.profile_id);
      if (profileId) {
        await assertProfileBelongsToMosque({
          supabase: input.supabase,
          profileId,
          mosqueId,
          label: "Team member profile",
          enforceMosqueMatch: input.session.role === "imam",
        });
      }

      return nextPayload;
    }
    case "mosque_tasks": {
      const scopedMosqueId = getScopedMosqueIdForSession(input.definition, input.session);
      let mosqueId =
        normalizeIdentifier(nextPayload.mosque_id) ??
        normalizeIdentifier(input.existingRecord?.mosque_id) ??
        scopedMosqueId;

      const teamId =
        normalizeIdentifier(nextPayload.team_id) ??
        normalizeIdentifier(input.existingRecord?.team_id);

      if (teamId) {
        const teamRecord = await loadManagementTeamRecord(input.supabase, teamId);
        const teamMosqueId = normalizeIdentifier(teamRecord.mosque_id);

        if (!teamMosqueId) {
          throw new AdminServiceError("The selected management team is not linked to a mosque", 400);
        }

        if (mosqueId && teamMosqueId !== mosqueId) {
          throw new AdminServiceError("Assigned team must belong to the same mosque as the task", 400);
        }

        mosqueId = teamMosqueId;
        nextPayload.team_id = teamId;
      }

      if (!mosqueId) {
        throw new AdminServiceError("Mosque tasks must belong to a mosque", 400);
      }

      if (input.session.role === "imam" && mosqueId !== assertImamHasMosque(input.session)) {
        throw new AdminAuthorizationError("You can only manage tasks for your appointed mosque", 403);
      }

      nextPayload.mosque_id = mosqueId;

      const assignedProfileId = normalizeIdentifier(nextPayload.assigned_to_profile_id);
      if (assignedProfileId) {
        await assertProfileBelongsToMosque({
          supabase: input.supabase,
          profileId: assignedProfileId,
          mosqueId,
          label: "Assigned task profile",
          enforceMosqueMatch: input.session.role === "imam",
        });
      }

      return nextPayload;
    }
    default:
      return nextPayload;
  }
}

function isMissingRelationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function sanitizeSearchTerm(value: string | null): string | null {
  if (!value) return null;
  const sanitized = value.trim().replace(/,/g, " ");
  return sanitized.length > 0 ? sanitized : null;
}

function toSummary(
  definition: AdminEntityDefinition,
  capability: AdminEntityCapability,
  count: number | null
): AdminEntitySummary {
  return {
    key: definition.key,
    label: definition.label,
    singularLabel: definition.singularLabel,
    description: definition.description,
    table: definition.table,
    primaryKey: definition.primaryKey,
    listFields: definition.listFields,
    formFields: definition.formFields,
    searchPlaceholder: definition.searchPlaceholder,
    singleton: definition.singleton,
    singletonId: definition.singletonId,
    capability,
    count,
  };
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function formatFieldValue(field: AdminFieldConfig, value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === "") {
    return null;
  }

  switch (field.type) {
    case "number": {
      if (value === null) return null;
      const numeric =
        typeof value === "number" ? value : Number(String(value).trim());
      if (Number.isNaN(numeric)) {
        throw new AdminServiceError(`${field.label} must be a valid number`, 400);
      }
      return numeric;
    }
    case "boolean":
      return Boolean(value);
    case "tags":
      if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
      }
      return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    case "json":
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return {};
        try {
          return JSON.parse(trimmed);
        } catch {
          throw new AdminServiceError(`${field.label} must be valid JSON`, 400);
        }
      }
      return ensureObject(value);
    case "datetime":
      if (value === null) return null;
      return new Date(String(value)).toISOString();
    case "text":
    case "textarea":
    case "email":
    case "tel":
    case "date":
    case "select":
    default:
      return typeof value === "string" ? value.trim() || null : value;
  }
}

function buildMutationPayload(
  definition: AdminEntityDefinition,
  input: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of definition.formFields) {
    if (field.readOnly) continue;
    if (!(field.key in input)) continue;
    result[field.key] = formatFieldValue(field, input[field.key]);
  }

  return result;
}

function applyEntityDefaults(
  definition: AdminEntityDefinition,
  payload: Record<string, unknown>,
  session: AdminSession,
  mode: "create" | "update"
): Record<string, unknown> {
  const nextPayload = { ...payload };

  if (definition.key === "mosques" && mode === "create" && !nextPayload.country) {
    nextPayload.country = "US";
  }

  if (definition.key === "events" && mode === "create") {
    nextPayload.created_by = session.userId;
  }

  if (definition.key === "announcements" && mode === "create") {
    nextPayload.created_by = session.userId;
    if (!("published_at" in nextPayload) || !nextPayload.published_at) {
      nextPayload.published_at = new Date().toISOString();
    }
  }

  if (definition.key === "posts" && mode === "create") {
    nextPayload.author_id = session.userId;
    if (!("visibility" in nextPayload) || !nextPayload.visibility) {
      nextPayload.visibility = "public";
    }
  }

  if (definition.key === "donations" && mode === "create") {
    if (!nextPayload.currency) {
      nextPayload.currency = "USD";
    }
  }

  if (definition.key === "management_teams") {
    nextPayload.updated_by = session.userId;
    if (mode === "create") {
      nextPayload.created_by = session.userId;
    }
  }

  if (definition.key === "imam_appointments") {
    nextPayload.updated_by = session.userId;
    if (mode === "create") {
      nextPayload.created_by = session.userId;
    }
  }

  if (definition.key === "mosque_tasks") {
    nextPayload.updated_by = session.userId;
    if (mode === "create") {
      nextPayload.created_by = session.userId;
    }
  }

  if (definition.key === "settings") {
    nextPayload.updated_by = session.userId;
    if (mode === "create") {
      nextPayload.created_by = session.userId;
      nextPayload.id = ADMIN_SETTINGS_SINGLETON_ID;
    }
  }

  return nextPayload;
}

async function loadMosqueLookup(
  supabase: SupabaseServerClient,
  session?: AdminSession
): Promise<AdminLookupOption[]> {
  let query = supabase
    .from("mosques")
    .select("id, name")
    .order("name", { ascending: true });

  if (session?.role === "imam") {
    query = applySessionScopeToQuery(
      query as any,
      resolveDefinition("mosques"),
      session
    ) as typeof query;
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    value: String(row.id),
    label: String(row.name),
  }));
}

async function loadProfileLookup(
  supabase: SupabaseServerClient,
  session?: AdminSession
): Promise<AdminLookupOption[]> {
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (session?.role === "imam") {
    query = query.eq("mosque_id", session.mosqueId ?? EMPTY_IMAM_SCOPE_UUID);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  const options = new Map<string, AdminLookupOption>();

  for (const row of data ?? []) {
    options.set(String(row.id), {
      value: String(row.id),
      label:
        row.full_name ||
        row.email ||
        `${String(row.role ?? "member")} ${String(row.id).slice(0, 8)}`,
    });
  }

  if (session?.mosqueId) {
    const imamIds = await loadImamIdsForMosque(supabase, session.mosqueId);

    if (imamIds.length > 0) {
      const { data: imamProfiles, error: imamProfilesError } = await supabase
        .from("imams")
        .select("profile_id")
        .in("id", imamIds)
        .eq("is_active", true)
        .not("profile_id", "is", null);

      if (imamProfilesError) {
        throw new AdminServiceError(imamProfilesError.message, 500);
      }

      const missingProfileIds = (imamProfiles ?? [])
        .map((row) => normalizeIdentifier(row.profile_id))
        .filter((value): value is string => Boolean(value))
        .filter((value) => !options.has(value));

      if (missingProfileIds.length > 0) {
        const { data: missingProfiles, error: missingProfilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", missingProfileIds);

        if (missingProfilesError) {
          throw new AdminServiceError(missingProfilesError.message, 500);
        }

        for (const row of missingProfiles ?? []) {
          options.set(String(row.id), {
            value: String(row.id),
            label:
              row.full_name ||
              row.email ||
              `${String(row.role ?? "member")} ${String(row.id).slice(0, 8)}`,
          });
        }
      }
    }
  }

  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

async function loadImamLookup(
  supabase: SupabaseServerClient,
  session?: AdminSession
): Promise<AdminLookupOption[]> {
  let scopedImamIds: string[] | null = null;

  if (session?.role === "imam" && session.mosqueId) {
    scopedImamIds = await loadImamIdsForMosque(supabase, session.mosqueId);
  }

  if (session?.role === "imam" && (!scopedImamIds || scopedImamIds.length === 0)) {
    return [];
  }

  let query = supabase
    .from("imams")
    .select("id, name, title")
    .order("name", { ascending: true });

  if (scopedImamIds) {
    query = query.in("id", scopedImamIds);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    value: String(row.id),
    label: row.title ? `${String(row.name)} (${String(row.title)})` : String(row.name),
  }));
}

async function loadManagementTeamLookup(
  supabase: SupabaseServerClient,
  session?: AdminSession
): Promise<AdminLookupOption[]> {
  let query = supabase
    .from("management_teams")
    .select("id, name")
    .order("name", { ascending: true });

  if (session?.role === "imam") {
    query = applySessionScopeToQuery(
      query as any,
      resolveDefinition("management_teams"),
      session
    ) as typeof query;
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    value: String(row.id),
    label: String(row.name),
  }));
}

async function loadLookups(
  supabase: SupabaseServerClient,
  definitions: AdminEntityDefinition[],
  session?: AdminSession
): Promise<Record<string, AdminLookupOption[]>> {
  const lookupKeys = new Set<string>();
  for (const definition of definitions) {
    for (const lookup of definition.lookupKeys ?? []) {
      lookupKeys.add(lookup);
    }
  }

  const lookupEntries = await Promise.all(
    Array.from(lookupKeys).map(async (lookupKey) => {
      if (lookupKey === "mosques") {
        return [lookupKey, await loadMosqueLookup(supabase, session)] as const;
      }

      if (lookupKey === "profiles") {
        return [lookupKey, await loadProfileLookup(supabase, session)] as const;
      }

      if (lookupKey === "imams") {
        return [lookupKey, await loadImamLookup(supabase, session)] as const;
      }

      if (lookupKey === "management_teams") {
        return [lookupKey, await loadManagementTeamLookup(supabase, session)] as const;
      }

      return [lookupKey, []] as const;
    })
  );

  return Object.fromEntries(lookupEntries);
}

async function countEntityRecords(
  supabase: SupabaseServerClient,
  definition: AdminEntityDefinition,
  session: AdminSession
): Promise<number | null> {
  if (definition.singleton) {
    return 1;
  }

  if (session.role === "imam" && definition.key === "imams") {
    if (!session.mosqueId) {
      return 0;
    }

    const imamIds = await loadImamIdsForMosque(supabase, session.mosqueId);
    return imamIds.length;
  }

  const query = applySessionScopeToQuery(
    supabase.from(definition.table).select("*", { count: "exact", head: true }) as any,
    definition,
    session
  ) as any;

  const { count, error } = await query;

  if (error) {
    return null;
  }

  return count ?? 0;
}

async function loadSettingsState(supabase: SupabaseServerClient): Promise<{
  record: AdminSettingsRecord;
  writable: boolean;
}> {
  const fallback = createDefaultAdminSettingsRecord();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .eq("id", ADMIN_SETTINGS_SINGLETON_ID)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        record: fallback,
        writable: false,
      };
    }
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from("admin_settings")
      .insert(fallback)
      .select("*")
      .single();

    if (insertError) {
      if (isMissingRelationError(insertError)) {
        return {
          record: fallback,
          writable: false,
        };
      }
      throw new AdminServiceError(insertError.message, 500);
    }

    return {
      record: normalizeAdminSettingsRecord(inserted as Partial<AdminSettingsRecord>),
      writable: true,
    };
  }

  return {
    record: normalizeAdminSettingsRecord(data as Partial<AdminSettingsRecord>),
    writable: true,
  };
}

function resolveDefinition(entityKey: string): AdminEntityDefinition {
  const definition = getAdminEntityDefinition(entityKey);
  if (!definition) {
    throw new AdminServiceError("Unknown admin entity", 404);
  }
  return definition;
}

export async function listAdminEntities(
  session: AdminSession
): Promise<AdminEntitiesResponse> {
  const supabase = await createClient();
  const settingsState = await loadSettingsState(supabase);
  const visibleEntities = listAdminEntityDefinitions()
    .map((definition) => ({
      definition,
      capability: buildEntityCapability(
        definition,
        session.role,
        settingsState.record.shura_permissions
      ),
    }))
    .filter((entry) => entry.capability.read);

  const counts = await Promise.all(
    visibleEntities.map((entry) =>
      countEntityRecords(supabase, entry.definition, session)
    )
  );

  const entities = visibleEntities.map((entry, index) =>
    toSummary(entry.definition, entry.capability, counts[index] ?? null)
  );

  return {
    entities,
    lookups: {},
    moduleSettings: settingsState.record.module_settings,
    realtimeFeed: resolveManagementRealtimeFeed(session),
    settingsWritable: settingsState.writable,
  };
}

export async function listAdminEntityRecords(input: {
  session: AdminSession;
  entityKey: string;
  limit?: number;
  offset?: number;
  search?: string | null;
  filters?: Record<string, string>;
}): Promise<AdminListResponse> {
  const definition = resolveDefinition(input.entityKey);
  const supabase = await createClient();
  const settingsState = await loadSettingsState(supabase);
  assertEntityAction(
    definition,
    input.session.role,
    "read",
    settingsState.record.shura_permissions
  );

  const capability = buildEntityCapability(
    definition,
    input.session.role,
    settingsState.record.shura_permissions
  );
  const lookups = await loadLookups(supabase, [definition], input.session);

  if (definition.key === "settings") {
    return {
      entity: toSummary(definition, capability, 1),
      items: [settingsState.record as unknown as Record<string, unknown>],
      total: 1,
      lookups,
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const search = sanitizeSearchTerm(input.search ?? null);
  const scopedImamIds =
    input.session.role === "imam" && definition.key === "imams"
      ? input.session.mosqueId
        ? await loadImamIdsForMosque(supabase, input.session.mosqueId)
        : []
      : null;

  let query = supabase
    .from(definition.table)
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order(definition.key === "donations" ? "created_at" : "updated_at", {
      ascending: false,
    });

  if (!scopedImamIds) {
    query = applySessionScopeToQuery(query as any, definition, input.session) as typeof query;
  }

  if (scopedImamIds) {
    query = query.in("id", scopedImamIds.length > 0 ? scopedImamIds : [EMPTY_IMAM_SCOPE_UUID]);
  }

  if (search && definition.searchColumns.length > 0) {
    query = query.or(
      definition.searchColumns
        .map((column) => `${column}.ilike.%${search}%`)
        .join(",")
    );
  }

  for (const [filterKey, filterValue] of Object.entries(input.filters ?? {})) {
    if (!filterValue) continue;
    const field = definition.formFields.find((entry) => entry.key === filterKey);
    if (!field) continue;
    if (field.type === "json" || field.type === "textarea" || field.type === "tags") {
      continue;
    }

    query = query.eq(filterKey, parseFilterValue(field, filterValue));
  }

  const { data, error, count } = await query;

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        entity: toSummary(definition, capability, 0),
        items: [],
        total: 0,
        lookups,
      };
    }

    throw new AdminServiceError(error.message, 500);
  }

  return {
    entity: toSummary(definition, capability, count ?? 0),
    items: (data ?? []) as Record<string, unknown>[],
    total: count ?? 0,
    lookups,
  };
}

export async function getAdminEntityRecord(input: {
  session: AdminSession;
  entityKey: string;
  id: string;
}): Promise<AdminItemResponse> {
  const definition = resolveDefinition(input.entityKey);
  const supabase = await createClient();
  const settingsState = await loadSettingsState(supabase);
  assertEntityAction(
    definition,
    input.session.role,
    "read",
    settingsState.record.shura_permissions
  );

  const capability = buildEntityCapability(
    definition,
    input.session.role,
    settingsState.record.shura_permissions
  );
  const lookups = await loadLookups(supabase, [definition], input.session);

  if (definition.key === "settings") {
    return {
      entity: toSummary(definition, capability, 1),
      item: settingsState.record as unknown as Record<string, unknown>,
      lookups,
    };
  }

  const data = await loadExistingEntityRecord(supabase, definition, input.id);

  await assertRecordWithinSessionScope({
    supabase,
    definition,
    session: input.session,
    record: data,
  });

  return {
    entity: toSummary(definition, capability, null),
    item: data as Record<string, unknown>,
    lookups,
  };
}

async function publishAdminMutation(params: {
  request: Request;
  session: AdminSession;
  definition: AdminEntityDefinition;
  entityId: string;
  mosqueId?: string | null;
  action: "created" | "updated" | "deleted";
}): Promise<void> {
  const idempotencyKey = await resolveIdempotencyKey(
    params.request,
    `admin:${params.definition.key}:${params.action}:${params.entityId}:${params.session.userId}`
  );

  await publishRealtimeEvent({
    eventType: `${params.definition.key}.${params.action}`,
    entityType: params.definition.key,
    entityId: params.entityId,
    actorUserId: params.session.userId,
    idempotencyKey,
    feedStreamId: ADMIN_REALTIME_FEED,
    feedStreamIds: params.mosqueId ? [getImamRealtimeFeed(params.mosqueId)] : [],
    payload: {
      entityKey: params.definition.key,
      action: params.action,
      mosqueId: params.mosqueId ?? null,
    },
  });
}

async function reconcileRelatedImamRecords(input: {
  supabase: SupabaseServerClient;
  session: AdminSession;
  definition: AdminEntityDefinition;
  item: Record<string, unknown>;
}): Promise<void> {
  if (input.definition.key === "imams") {
    await syncImamAppointmentFromImamRecord({
      supabase: input.supabase,
      imamRecord: input.item,
      session: input.session,
    });
    return;
  }

  if (input.definition.key !== "imam_appointments") {
    return;
  }

  const imamId = normalizeIdentifier(input.item.imam_id);
  if (!imamId) {
    return;
  }

  if (input.item.is_primary === true) {
    const appointmentId = normalizeIdentifier(input.item.id);
    const { error } = await input.supabase
      .from("imam_appointments")
      .update({
        is_primary: false,
        updated_by: input.session.userId,
      })
      .eq("imam_id", imamId)
      .neq("id", appointmentId ?? "");

    if (error && !isMissingRelationError(error)) {
      throw new AdminServiceError(error.message, 500);
    }
  }

  await syncImamRecordPrimaryAssignment(input.supabase, imamId);
}

export async function createAdminEntityRecord(input: {
  request: Request;
  session: AdminSession;
  entityKey: string;
  payload: Record<string, unknown>;
}): Promise<AdminItemResponse> {
  const definition = resolveDefinition(input.entityKey);
  const supabase = await createClient();
  const settingsState = await loadSettingsState(supabase);
  assertEntityAction(
    definition,
    input.session.role,
    "create",
    settingsState.record.shura_permissions
  );

  const capability = buildEntityCapability(
    definition,
    input.session.role,
    settingsState.record.shura_permissions
  );
  const lookups = await loadLookups(supabase, [definition], input.session);

  if (definition.key === "settings") {
    if (!settingsState.writable) {
      throw new AdminServiceError(
        "The admin_settings table is not available yet. Run the latest SQL migration first.",
        500
      );
    }

    const mutationPayload = applyEntityDefaults(
      definition,
      applySessionScopeToMutationPayload(
        definition,
        buildMutationPayload(definition, input.payload),
        input.session
      ),
      input.session,
      "create"
    );

    const { data, error } = await supabase
      .from("admin_settings")
      .upsert({
        ...settingsState.record,
        ...mutationPayload,
      })
      .select("*")
      .single();

    if (error) {
      throw new AdminServiceError(error.message, 500);
    }

    const item = normalizeAdminSettingsRecord(
      data as Partial<AdminSettingsRecord>
    ) as unknown as Record<string, unknown>;

    await publishAdminMutation({
      request: input.request,
      session: input.session,
      definition,
      entityId: ADMIN_SETTINGS_SINGLETON_ID,
      action: "updated",
      mosqueId: null,
    });

    return {
      entity: toSummary(definition, capability, 1),
      item,
      lookups,
    };
  }

  const mutationPayload = applyEntityDefaults(
    definition,
    applySessionScopeToMutationPayload(
      definition,
      buildMutationPayload(definition, input.payload),
      input.session
    ),
    input.session,
    "create"
  );

  const preparedPayload = await applyRelationalIntegrityToMutationPayload({
    supabase,
    definition,
    payload: mutationPayload,
    session: input.session,
  });

  const { data, error } = await supabase
    .from(definition.table)
    .insert(preparedPayload)
    .select("*")
    .single();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (definition.key === "imams" || definition.key === "imam_appointments") {
    await reconcileRelatedImamRecords({
      supabase,
      session: input.session,
      definition,
      item: data as Record<string, unknown>,
    });
  }

  const entityId = String(
    (data as Record<string, unknown>)[definition.primaryKey] ?? ""
  );
  const mosqueId = resolveRecordMosqueId(
    definition,
    data as Record<string, unknown>
  );

  await publishAdminMutation({
    request: input.request,
    session: input.session,
    definition,
    entityId,
    action: "created",
    mosqueId,
  });

  return {
    entity: toSummary(definition, capability, null),
    item: data as Record<string, unknown>,
    lookups,
  };
}

export async function updateAdminEntityRecord(input: {
  request: Request;
  session: AdminSession;
  entityKey: string;
  id: string;
  payload: Record<string, unknown>;
}): Promise<AdminItemResponse> {
  const definition = resolveDefinition(input.entityKey);
  const supabase = await createClient();
  const settingsState = await loadSettingsState(supabase);
  assertEntityAction(
    definition,
    input.session.role,
    "update",
    settingsState.record.shura_permissions
  );

  const capability = buildEntityCapability(
    definition,
    input.session.role,
    settingsState.record.shura_permissions
  );
  const lookups = await loadLookups(supabase, [definition], input.session);

  if (definition.key === "settings") {
    if (!settingsState.writable) {
      throw new AdminServiceError(
        "The admin_settings table is not available yet. Run the latest SQL migration first.",
        500
      );
    }

    const mutationPayload = applyEntityDefaults(
      definition,
      applySessionScopeToMutationPayload(
        definition,
        buildMutationPayload(definition, input.payload),
        input.session
      ),
      input.session,
      "update"
    );

    const { data, error } = await supabase
      .from("admin_settings")
      .upsert({
        ...settingsState.record,
        ...mutationPayload,
        id: ADMIN_SETTINGS_SINGLETON_ID,
      })
      .select("*")
      .single();

    if (error) {
      throw new AdminServiceError(error.message, 500);
    }

    const item = normalizeAdminSettingsRecord(
      data as Partial<AdminSettingsRecord>
    ) as unknown as Record<string, unknown>;

    await publishAdminMutation({
      request: input.request,
      session: input.session,
      definition,
      entityId: ADMIN_SETTINGS_SINGLETON_ID,
      action: "updated",
      mosqueId: null,
    });

    return {
      entity: toSummary(definition, capability, 1),
      item,
      lookups,
    };
  }

  const mutationPayload = applyEntityDefaults(
    definition,
    applySessionScopeToMutationPayload(
      definition,
      buildMutationPayload(definition, input.payload),
      input.session
    ),
    input.session,
    "update"
  );

  const existingRecord = await loadExistingEntityRecord(supabase, definition, input.id);
  await assertRecordWithinSessionScope({
    supabase,
    definition,
    session: input.session,
    record: existingRecord,
  });

  if (definition.key === "profiles") {
    const existingProfile = await loadExistingProfileRecord(supabase, input.id);
    assertCanManageProfileMutation({
      session: input.session,
      targetProfile: existingProfile,
      payload: mutationPayload,
    });
  }

  const preparedPayload = await applyRelationalIntegrityToMutationPayload({
    supabase,
    definition,
    payload: mutationPayload,
    session: input.session,
    existingRecord,
  });

  const { data, error } = await supabase
    .from(definition.table)
    .update(preparedPayload)
    .eq(definition.primaryKey, input.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Record not found", 404);
  }

  if (definition.key === "imam_appointments") {
    await reconcileRelatedImamRecords({
      supabase,
      session: input.session,
      definition,
      item: data as Record<string, unknown>,
    });
  }

  const mosqueId = resolveRecordMosqueId(
    definition,
    data as Record<string, unknown>
  );

  await publishAdminMutation({
    request: input.request,
    session: input.session,
    definition,
    entityId: input.id,
    action: "updated",
    mosqueId,
  });

  return {
    entity: toSummary(definition, capability, null),
    item: data as Record<string, unknown>,
    lookups,
  };
}

export async function deleteAdminEntityRecord(input: {
  request: Request;
  session: AdminSession;
  entityKey: string;
  id: string;
}): Promise<void> {
  const definition = resolveDefinition(input.entityKey);
  const supabase = await createClient();
  const settingsState = await loadSettingsState(supabase);
  assertEntityAction(
    definition,
    input.session.role,
    "delete",
    settingsState.record.shura_permissions
  );

  if (definition.singleton) {
    throw new AdminServiceError("Singleton settings cannot be deleted", 400);
  }

  if (definition.key === "profiles") {
    const existingProfile = await loadExistingProfileRecord(supabase, input.id);

    if (input.id === input.session.userId) {
      throw new AdminServiceError("You cannot delete your own profile", 403);
    }

    assertCanManageProfileMutation({
      session: input.session,
      targetProfile: existingProfile,
    });
  }

  const existingRecord = await loadExistingEntityRecord(supabase, definition, input.id);
  const mosqueId = await assertRecordWithinSessionScope({
    supabase,
    definition,
    session: input.session,
    record: existingRecord,
  });

  const { data, error } = await supabase
    .from(definition.table)
    .delete()
    .eq(definition.primaryKey, input.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Record not found", 404);
  }

  await reconcileRelatedImamRecords({
    supabase,
    session: input.session,
    definition,
    item: data as Record<string, unknown>,
  });

  await publishAdminMutation({
    request: input.request,
    session: input.session,
    definition,
    entityId: input.id,
    action: "deleted",
    mosqueId,
  });
}

export function toAdminErrorResponse(error: unknown): {
  status: number;
  message: string;
} {
  if (
    error instanceof AdminServiceError ||
    error instanceof AdminAuthorizationError
  ) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "Internal server error",
  };
}
