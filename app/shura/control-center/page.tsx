import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraControlCenterPage() {
  return (
    <AdminControlCenter
      title="Shura Control Center"
      description="Operate across all mosques, dispatch teams, monitor progress, and manage the network-wide mosque workflow in real time."
      allowedEntityKeys={[
        "mosques",
        "prayer_times",
        "events",
        "announcements",
        "imams",
        "management_teams",
        "management_team_members",
        "mosque_tasks",
        "donations",
        "posts",
      ]}
      initialEntityKey="mosques"
    />
  );
}
