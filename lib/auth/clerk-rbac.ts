export type AppRole = "super_admin" | "admin" | "shura" | "imam" | "member";

const CLERK_ROLE_TO_APP_ROLE: Record<string, AppRole> = {
  "org:super_admin": "super_admin",
  super_admin: "super_admin",
  "org:admin": "admin",
  admin: "admin",
  "org:shura": "shura",
  shura: "shura",
  "org:imam": "imam",
  imam: "imam",
};

export function normalizeClerkRole(orgRole: string | null | undefined): AppRole {
  if (!orgRole) return "member";
  return CLERK_ROLE_TO_APP_ROLE[orgRole] ?? "member";
}

export function canAccessAdminPanel(role: AppRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function canAccessShuraPanel(role: AppRole): boolean {
  return role === "admin" || role === "super_admin" || role === "shura";
}

export function canManageAllMosques(role: AppRole): boolean {
  return role === "admin" || role === "super_admin" || role === "shura";
}

export function canManageImams(role: AppRole): boolean {
  return role === "admin" || role === "super_admin" || role === "shura";
}

export function canManageMosque(args: {
  role: AppRole;
  targetMosqueId: string;
  userMosqueId: string | null;
  userMosqueIds?: string[] | null;
}): boolean {
  const { role, targetMosqueId, userMosqueId, userMosqueIds } = args;

  if (canManageAllMosques(role)) {
    return true;
  }

  if (role === "imam") {
    const scopedMosqueIds = new Set(
      [userMosqueId, ...(userMosqueIds ?? [])].filter(
        (value): value is string => Boolean(value)
      )
    );
    return scopedMosqueIds.has(targetMosqueId);
  }

  return false;
}
