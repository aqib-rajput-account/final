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
  normalizeAdminSettingsRecord,
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
  supabase: SupabaseServerClient
): Promise<AdminLookupOption[]> {
  const { data, error } = await supabase
    .from("mosques")
    .select("id, name")
    .order("name", { ascending: true });

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
  definitions: AdminEntityDefinition[]
): Promise<Record<string, AdminLookupOption[]>> {
  const lookupKeys = new Set<string>();
  for (const definition of definitions) {
    for (const lookup of definition.lookupKeys ?? []) {
      lookupKeys.add(lookup);
    }
  }

  const lookups: Record<string, AdminLookupOption[]> = {};

  if (lookupKeys.has("mosques")) {
    lookups.mosques = await loadMosqueLookup(supabase);
  }

  return lookups;
}

async function countEntityRecords(
  supabase: SupabaseServerClient,
  definition: AdminEntityDefinition
): Promise<number | null> {
  if (definition.singleton) {
    return 1;
  }

  const { count, error } = await supabase
    .from(definition.table)
    .select("*", { count: "exact", head: true });

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
  const definitions = listAdminEntityDefinitions();
  const visibleDefinitions = definitions.filter((definition) =>
    buildEntityCapability(
      definition,
      session.role,
      settingsState.record.shura_permissions
    ).read
  );

  const lookups = await loadLookups(supabase, visibleDefinitions);
  const entities: AdminEntitySummary[] = [];

  for (const definition of visibleDefinitions) {
    const capability = buildEntityCapability(
      definition,
      session.role,
      settingsState.record.shura_permissions
    );
    const count = await countEntityRecords(supabase, definition);
    entities.push(toSummary(definition, capability, count));
  }

  return {
    entities,
    lookups,
    moduleSettings: settingsState.record.module_settings,
    realtimeFeed: ADMIN_REALTIME_FEED,
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
  const lookups = await loadLookups(supabase, [definition]);

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

  let query = supabase
    .from(definition.table)
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order(definition.key === "donations" ? "created_at" : "updated_at", {
      ascending: false,
    });

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
  const lookups = await loadLookups(supabase, [definition]);

  if (definition.key === "settings") {
    return {
      entity: toSummary(definition, capability, 1),
      item: settingsState.record as unknown as Record<string, unknown>,
      lookups,
    };
  }

  const { data, error } = await supabase
    .from(definition.table)
    .select("*")
    .eq(definition.primaryKey, input.id)
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Record not found", 404);
  }

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
    payload: {
      entityKey: params.definition.key,
      action: params.action,
    },
  });
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
  const lookups = await loadLookups(supabase, [definition]);

  if (definition.key === "settings") {
    if (!settingsState.writable) {
      throw new AdminServiceError(
        "The admin_settings table is not available yet. Run the latest SQL migration first.",
        500
      );
    }

    const mutationPayload = applyEntityDefaults(
      definition,
      buildMutationPayload(definition, input.payload),
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
    });

    return {
      entity: toSummary(definition, capability, 1),
      item,
      lookups,
    };
  }

  const mutationPayload = applyEntityDefaults(
    definition,
    buildMutationPayload(definition, input.payload),
    input.session,
    "create"
  );

  const { data, error } = await supabase
    .from(definition.table)
    .insert(mutationPayload)
    .select("*")
    .single();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  const entityId = String(
    (data as Record<string, unknown>)[definition.primaryKey] ?? ""
  );

  await publishAdminMutation({
    request: input.request,
    session: input.session,
    definition,
    entityId,
    action: "created",
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
  const lookups = await loadLookups(supabase, [definition]);

  if (definition.key === "settings") {
    if (!settingsState.writable) {
      throw new AdminServiceError(
        "The admin_settings table is not available yet. Run the latest SQL migration first.",
        500
      );
    }

    const mutationPayload = applyEntityDefaults(
      definition,
      buildMutationPayload(definition, input.payload),
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
    });

    return {
      entity: toSummary(definition, capability, 1),
      item,
      lookups,
    };
  }

  const mutationPayload = applyEntityDefaults(
    definition,
    buildMutationPayload(definition, input.payload),
    input.session,
    "update"
  );

  if (definition.key === "profiles") {
    const existingProfile = await loadExistingProfileRecord(supabase, input.id);
    assertCanManageProfileMutation({
      session: input.session,
      targetProfile: existingProfile,
      payload: mutationPayload,
    });
  }

  const { data, error } = await supabase
    .from(definition.table)
    .update(mutationPayload)
    .eq(definition.primaryKey, input.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Record not found", 404);
  }

  await publishAdminMutation({
    request: input.request,
    session: input.session,
    definition,
    entityId: input.id,
    action: "updated",
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

  const { data, error } = await supabase
    .from(definition.table)
    .delete()
    .eq(definition.primaryKey, input.id)
    .select(definition.primaryKey)
    .maybeSingle();

  if (error) {
    throw new AdminServiceError(error.message, 500);
  }

  if (!data) {
    throw new AdminServiceError("Record not found", 404);
  }

  await publishAdminMutation({
    request: input.request,
    session: input.session,
    definition,
    entityId: input.id,
    action: "deleted",
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
