import { createClient } from "@/lib/supabase/server";
import type {
  AdminEntityAction,
  AdminEntityCapability,
  AdminUserRole,
  ShuraPermissionMap,
} from "@/lib/admin/types";
import { resolveAuthenticatedUserId } from "@/backend/auth/request-auth";
import type { AdminEntityDefinition } from "./entities";

export interface AdminSession {
  userId: string;
  role: AdminUserRole;
  mosqueId: string | null;
}

export class AdminAuthorizationError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

function normalizeRole(value: unknown): AdminUserRole {
  if (
    value === "super_admin" ||
    value === "admin" ||
    value === "shura" ||
    value === "imam"
  ) {
    return value;
  }

  return "member";
}

export async function resolveAdminSession(
  request: Request
): Promise<AdminSession | null> {
  const userId = await resolveAuthenticatedUserId(request);
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, mosque_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const role = normalizeRole(data.role);
  let mosqueId = role === "imam" ? null : data.mosque_id ?? null;

  if (role === "imam") {
    const { data: linkedImams, error: linkedImamsError } = await supabase
      .from("imams")
      .select("id, mosque_id, appointed_date")
      .eq("profile_id", userId)
      .eq("is_active", true)
      .order("appointed_date", { ascending: false, nullsFirst: false })
      .limit(10);

    if (linkedImamsError) {
      return null;
    }

    const imamIds = (linkedImams ?? []).map((row) => String(row.id));
    let primaryAppointmentMosqueId: string | null = null;

    if (imamIds.length > 0) {
      const { data: imamAppointment, error: imamAppointmentError } = await supabase
        .from("imam_appointments")
        .select("mosque_id")
        .in("imam_id", imamIds)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("appointed_date", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (imamAppointmentError && imamAppointmentError.code !== "42P01") {
        return null;
      }

      primaryAppointmentMosqueId = imamAppointment?.mosque_id ?? null;
    }

    mosqueId =
      primaryAppointmentMosqueId ??
      linkedImams?.find((entry) => entry.mosque_id)?.mosque_id ??
      data.mosque_id ??
      null;
  }

  return {
    userId,
    role,
    mosqueId,
  };
}

export function canAccessAdminSurface(role: AdminUserRole): boolean {
  return role === "admin" || role === "super_admin" || role === "shura" || role === "imam";
}

function includesRole(roles: AdminUserRole[], role: AdminUserRole): boolean {
  if (role === "super_admin") return true;
  return roles.includes(role);
}

export function hasEntityActionPermission(
  definition: AdminEntityDefinition,
  role: AdminUserRole,
  action: AdminEntityAction,
  shuraPermissions: ShuraPermissionMap
): boolean {
  if (!includesRole(definition.permissions[action], role)) {
    return false;
  }

  if (role !== "shura") {
    return true;
  }

  return shuraPermissions[definition.key][action];
}

export function buildEntityCapability(
  definition: AdminEntityDefinition,
  role: AdminUserRole,
  shuraPermissions: ShuraPermissionMap
): AdminEntityCapability {
  return {
    read: hasEntityActionPermission(definition, role, "read", shuraPermissions),
    create: hasEntityActionPermission(definition, role, "create", shuraPermissions),
    update: hasEntityActionPermission(definition, role, "update", shuraPermissions),
    delete: hasEntityActionPermission(definition, role, "delete", shuraPermissions),
  };
}

export function assertEntityAction(
  definition: AdminEntityDefinition,
  role: AdminUserRole,
  action: AdminEntityAction,
  shuraPermissions: ShuraPermissionMap
): void {
  if (hasEntityActionPermission(definition, role, action, shuraPermissions)) {
    return;
  }

  throw new AdminAuthorizationError("Forbidden", 403);
}
