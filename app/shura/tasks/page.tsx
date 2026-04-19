import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraTasksPage() {
  return (
    <AdminControlCenter
      title="Task Dispatch"
      description="Assign mosque tasks across the network, track progress, and keep each team accountable for delivery."
      allowedEntityKeys={["mosque_tasks"]}
      initialEntityKey="mosque_tasks"
    />
  );
}
