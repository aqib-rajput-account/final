import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraImamsPage() {
  return (
    <AdminControlCenter
      title="Imam Appointments"
      description="Oversee imam profiles, mosque appointments, assignment coverage, and leadership continuity across all mosques."
      allowedEntityKeys={["imams", "imam_appointments"]}
      initialEntityKey="imams"
    />
  );
}
