import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ImamTaskBoardPage() {
  return (
    <AdminControlCenter
      title="Mosque Task Board"
      description="Assign, monitor, and complete mosque tasks for the team operating under your appointed mosque."
      allowedEntityKeys={["mosque_tasks"]}
      initialEntityKey="mosque_tasks"
    />
  );
}
