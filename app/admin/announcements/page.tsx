import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminAnnouncementsPage() {
  return (
    <AdminControlCenter
      title="Announcement Management"
      description="Publish and update announcements with the same live CRUD surface used across the Admin Panel."
      allowedEntityKeys={["announcements"]}
      initialEntityKey="announcements"
    />
  );
}
