import { AdminSettingsConsole } from "@/components/admin/admin-settings-console";

export default function SuperAdminSettingsPage() {
  return (
    <AdminSettingsConsole
      title="Super Admin Settings"
      description="Manage platform-wide modules, governance defaults, privacy behavior, and Shura permissions from a dedicated super-admin surface."
    />
  );
}
