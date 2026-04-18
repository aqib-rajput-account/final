import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamCommunityPage() {
  return (
    <AdminControlCenter
      title="Community Posts"
      description="Moderate and publish mosque-scoped posts that appear in your community feed."
      allowedEntityKeys={["posts"]}
      initialEntityKey="posts"
    />
  );
}
