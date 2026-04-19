import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraTeamsPage() {
  return (
    <AdminControlCenter
      title="Operations Teams"
      description="Create field teams, attach members, and connect each team to the mosque work they are responsible for delivering."
      allowedEntityKeys={["management_teams", "management_team_members"]}
      initialEntityKey="management_teams"
    />
  );
}
