import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraImamsPage() {
  return (
    <AdminControlCenter
      title="Imam Appointments"
      description="Oversee imam assignments, status, appointment history, and leadership coverage across all mosques."
      allowedEntityKeys={["imams"]}
      initialEntityKey="imams"
    />
  );
}
