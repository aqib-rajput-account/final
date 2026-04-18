import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminFinancePage() {
  return (
    <AdminControlCenter
      title="Finance Records"
      description="Manage donation records in real time. Expense and goal entities can plug into the same registry once those tables are added."
      allowedEntityKeys={["donations"]}
      initialEntityKey="donations"
    />
  );
}
