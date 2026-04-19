import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraPrayerTimesPage() {
  return (
    <AdminControlCenter
      title="Prayer Times Oversight"
      description="Review and update prayer schedules across all mosques from the Shura operations surface."
      allowedEntityKeys={["prayer_times"]}
      initialEntityKey="prayer_times"
    />
  );
}
