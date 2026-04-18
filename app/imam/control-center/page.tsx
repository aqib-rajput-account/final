import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamControlCenterPage() {
  return (
    <AdminControlCenter
      title="Imam Control Center"
      description="Manage your mosque's live profile, prayer schedule, events, announcements, team records, community posts, and donations from one mosque-scoped workspace."
      allowedEntityKeys={[
        "mosques",
        "prayer_times",
        "events",
        "announcements",
        "imams",
        "posts",
        "donations",
      ]}
      initialEntityKey="mosques"
    />
  );
}
