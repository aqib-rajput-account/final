import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function AdminMosquesPage() {
  return (
    <AdminControlCenter
      title="Mosque Management"
      description="Manage the live mosque directory, verification state, and listing metadata from the shared admin CRUD surface."
      allowedEntityKeys={["mosques"]}
      initialEntityKey="mosques"
    />
  );
}
