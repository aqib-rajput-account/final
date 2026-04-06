export type AppRole = "admin" | "shura" | "imam" | "member";

const CLERK_ROLE_TO_APP_ROLE: Record<string, AppRole> = {
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
  return role === "admin";
}

export function canAccessShuraPanel(role: AppRole): boolean {
  return role === "admin" || role === "shura";
}

export function canManageAllMosques(role: AppRole): boolean {
  return role === "admin" || role === "shura";
}

export function canManageImams(role: AppRole): boolean {
  return role === "admin" || role === "shura";
}

export function canManageMosque(args: {
  role: AppRole;
  targetMosqueId: string;
  userMosqueId: string | null;
}): boolean {
  const { role, targetMosqueId, userMosqueId } = args;

  if (canManageAllMosques(role)) {
    return true;
  }

  if (role === "imam") {
    return Boolean(userMosqueId && targetMosqueId === userMosqueId);
  }

  return false;
}
