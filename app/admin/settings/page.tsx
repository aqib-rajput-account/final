import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminSettingsPage() {
  return (
    <AdminControlCenter
      title="Application Settings"
      description="This singleton record controls module availability, live defaults, and the Shura permission map without a redeploy."
      allowedEntityKeys={["settings"]}
      initialEntityKey="settings"
    />
  );
}
