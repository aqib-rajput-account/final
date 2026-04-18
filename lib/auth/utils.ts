import { type UserRole, ROLE_HIERARCHY, getRoleLevel, hasRoleOrHigher } from "./context";

// Define route access requirements
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin": ["admin", "super_admin"],
  "/admin/users": ["admin", "super_admin"],
  "/admin/mosques": ["admin", "super_admin"],
  "/admin/events": ["admin", "super_admin"],
  "/admin/finance": ["admin", "super_admin"],
  "/admin/announcements": ["admin", "super_admin"],
  "/shura": ["shura", "admin", "super_admin"],
  "/shura/members": ["shura", "admin", "super_admin"],
  "/shura/proposals": ["shura", "admin", "super_admin"],
  "/shura/meetings": ["shura", "admin", "super_admin"],
};

// Define permissions for specific actions
export const ACTION_PERMISSIONS: Record<string, UserRole[]> = {
  "users:manage": ["admin", "super_admin"],
  "users:view": ["admin", "super_admin"],
  "roles:assign": ["admin", "super_admin"],
  "mosque:create": ["admin", "super_admin"],
  "mosque:edit": ["admin", "super_admin"],
  "mosque:delete": ["super_admin"],
  "event:create": ["imam", "shura", "admin", "super_admin"],
  "event:edit": ["imam", "shura", "admin", "super_admin"],
  "event:delete": ["admin", "super_admin"],
  "announcement:create": ["imam", "shura", "admin", "super_admin"],
  "announcement:edit": ["imam", "shura", "admin", "super_admin"],
  "announcement:delete": ["admin", "super_admin"],
  "finance:view": ["shura", "admin", "super_admin"],
  "finance:manage": ["admin", "super_admin"],
  "shura:access": ["shura", "admin", "super_admin"],
  "shura:manage": ["admin", "super_admin"],
};

/**
 * Check if a user with the given role can access a specific route
 */
export function canAccessRoute(userRole: UserRole | undefined, route: string): boolean {
  if (!userRole) return false;
  
  // Super admin can access everything
  if (userRole === "super_admin") return true;
  
  // Check exact route match
  if (ROUTE_PERMISSIONS[route]) {
    return ROUTE_PERMISSIONS[route].includes(userRole);
  }
  
  // Check for parent route match (e.g., /admin/mosques/123 should check /admin/mosques)
  const routeParts = route.split("/").filter(Boolean);
  for (let i = routeParts.length; i > 0; i--) {
    const parentRoute = "/" + routeParts.slice(0, i).join("/");
    if (ROUTE_PERMISSIONS[parentRoute]) {
      return ROUTE_PERMISSIONS[parentRoute].includes(userRole);
    }
  }
  
  // If no specific permission is defined, allow access for authenticated users
  return true;
}

/**
 * Check if a user has permission for a specific action
 */
export function hasPermission(userRole: UserRole | undefined, action: string): boolean {
  if (!userRole) return false;
  
  // Super admin has all permissions
  if (userRole === "super_admin") return true;
  
  const allowedRoles = ACTION_PERMISSIONS[action];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(userRole);
}

/**
 * Get all roles that a user with the given role can manage (assign to others)
 */
export function getManageableRoles(userRole: UserRole): UserRole[] {
  if (userRole === "super_admin") {
    // Super admin can assign any role
    return [...ROLE_HIERARCHY];
  }
  
  if (userRole === "admin") {
    // Admin can assign roles below them
    return ROLE_HIERARCHY.filter(role => getRoleLevel(role) < getRoleLevel("admin"));
  }
  
  // Other roles cannot assign roles
  return [];
}

/**
 * Check if a user can manage another user (e.g., change their role)
 */
export function canManageUser(managerRole: UserRole | undefined, targetRole: UserRole): boolean {
  if (!managerRole) return false;
  
  // Only super_admin can manage other super_admins
  if (targetRole === "super_admin") {
    return managerRole === "super_admin";
  }
  
  // Super admin can manage anyone
  if (managerRole === "super_admin") return true;
  
  // Admin can manage users with lower roles
  if (managerRole === "admin") {
    return getRoleLevel(targetRole) < getRoleLevel("admin");
  }
  
  return false;
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    shura: "Shura Member",
    imam: "Imam",
    member: "Member",
  };
  return displayNames[role] || role;
}

/**
 * Get role badge color
 */
export function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "super_admin":
      return "destructive";
    case "admin":
      return "default";
    case "shura":
      return "secondary";
    default:
      return "outline";
  }
}

export { ROLE_HIERARCHY, getRoleLevel, hasRoleOrHigher };
