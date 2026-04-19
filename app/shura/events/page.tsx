import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraEventsPage() {
  return (
    <AdminControlCenter
      title="Network Events"
      description="Coordinate cross-mosque events, reviews, and published programming from one shared Shura workspace."
      allowedEntityKeys={["events"]}
      initialEntityKey="events"
    />
  );
}
