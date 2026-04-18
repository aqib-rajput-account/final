import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamTeamPage() {
  return (
    <AdminControlCenter
      title="Imam Team"
      description="Manage imam records, biographies, languages, and appointment details for your mosque."
      allowedEntityKeys={["imams"]}
      initialEntityKey="imams"
    />
  );
}
