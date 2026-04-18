import { UserManagementConsole } from "@/components/admin/user-management-console";

export default function SuperAdminUsersPage() {
  return (
    <UserManagementConsole
      title="Super Admin User Governance"
      description="Oversee role hierarchy, verification, account state, and elevated-access changes from a dedicated super-admin panel."
      primaryActionHref="/super-admin/control-center"
      primaryActionLabel="Open Super Control Center"
    />
  );
}
