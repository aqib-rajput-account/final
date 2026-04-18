import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamPrayerTimesPage() {
  return (
    <AdminControlCenter
      title="Prayer Times"
      description="Manage adhan, iqama, sunrise, and Jummah timings for your mosque in real time."
      allowedEntityKeys={["prayer_times"]}
      initialEntityKey="prayer_times"
    />
  );
}
