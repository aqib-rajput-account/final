import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminImamsPage() {
  return (
    <AdminControlCenter
      title="Imam Management"
      description="Manage imam assignments, biographies, languages, and activation state from the live admin CRUD layer."
      allowedEntityKeys={["imams"]}
      initialEntityKey="imams"
    />
  );
}
