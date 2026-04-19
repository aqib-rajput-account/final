import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraAnnouncementsPage() {
  return (
    <AdminControlCenter
      title="Network Announcements"
      description="Manage mosque-wide and network-wide notices, follow-ups, and published operational announcements."
      allowedEntityKeys={["announcements"]}
      initialEntityKey="announcements"
    />
  );
}
