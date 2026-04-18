import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamEventsPage() {
  return (
    <AdminControlCenter
      title="Mosque Events"
      description="Create and manage khutbahs, classes, programs, and community events for your mosque."
      allowedEntityKeys={["events"]}
      initialEntityKey="events"
    />
  );
}
