import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminEventsPage() {
  return (
    <AdminControlCenter
      title="Event Management"
      description="Create, publish, and update live events from the shared admin entity registry."
      allowedEntityKeys={["events"]}
      initialEntityKey="events"
    />
  );
}
