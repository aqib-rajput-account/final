import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminPrayerTimesPage() {
  return (
    <AdminControlCenter
      title="Prayer Times Management"
      description="Manage daily prayer schedules, iqama times, and Jummah timing from the shared live CRUD layer."
      allowedEntityKeys={["prayer_times"]}
      initialEntityKey="prayer_times"
    />
  );
}
