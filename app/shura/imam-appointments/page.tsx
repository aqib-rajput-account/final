import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraImamAppointmentsPage() {
  return (
    <AdminControlCenter
      title="Imam Appointment Registry"
      description="Manage imam-to-mosque appointments, primary placements, and assignment coverage across the entire mosque network."
      allowedEntityKeys={["imam_appointments"]}
      initialEntityKey="imam_appointments"
    />
  );
}
