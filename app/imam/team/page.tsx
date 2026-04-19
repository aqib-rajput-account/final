import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamOperationsTeamPage() {
  return (
    <AdminControlCenter
      title="Operations Team"
      description="Build the mosque team working under your leadership, assign roles, and keep each member attached to the right operational unit."
      allowedEntityKeys={["management_teams", "management_team_members"]}
      initialEntityKey="management_teams"
    />
  );
}
