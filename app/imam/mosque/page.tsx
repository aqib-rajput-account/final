import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamMosquePage() {
  return (
    <AdminControlCenter
      title="Mosque Settings"
      description="Update the core profile, contact details, facilities, and location settings for your mosque."
      allowedEntityKeys={["mosques"]}
      initialEntityKey="mosques"
    />
  );
}
