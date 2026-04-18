import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminCommunityPage() {
  return (
    <AdminControlCenter
      title="Community Management"
      description="Manage profiles and feed content from the same generic CRUD layer that powers the rest of the Admin Panel."
      allowedEntityKeys={["profiles", "posts"]}
      initialEntityKey="profiles"
    />
  );
}
