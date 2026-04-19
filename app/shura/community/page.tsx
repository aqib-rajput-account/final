import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraCommunityPage() {
  return (
    <AdminControlCenter
      title="Community Oversight"
      description="Review and moderate mosque posts and community communication across the full Shura network."
      allowedEntityKeys={["posts"]}
      initialEntityKey="posts"
    />
  );
}
