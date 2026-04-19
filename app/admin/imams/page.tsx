import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminImamsPage() {
  return (
    <AdminControlCenter
      title="Imam Management"
      description="Manage imam profiles and mosque appointments together so leadership records and mosque relationships stay in sync."
      allowedEntityKeys={["imams", "imam_appointments"]}
      initialEntityKey="imams"
    />
  );
}
