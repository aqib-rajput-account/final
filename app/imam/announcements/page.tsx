import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamAnnouncementsPage() {
  return (
    <AdminControlCenter
      title="Mosque Announcements"
      description="Publish urgent notices, reminders, and weekly updates for your mosque community."
      allowedEntityKeys={["announcements"]}
      initialEntityKey="announcements"
    />
  );
}
