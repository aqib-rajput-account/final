import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamTeamPage() {
  return (
    <AdminControlCenter
      title="Mosque Leadership"
      description="Manage active imam appointments, biographies, languages, and leadership records for your appointed mosque."
      allowedEntityKeys={["imams"]}
      initialEntityKey="imams"
    />
  );
}
