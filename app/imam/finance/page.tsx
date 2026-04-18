import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamFinancePage() {
  return (
    <AdminControlCenter
      title="Mosque Donations"
      description="Review and manage donation records tied to your mosque without exposing broader platform finances."
      allowedEntityKeys={["donations"]}
      initialEntityKey="donations"
    />
  );
}
