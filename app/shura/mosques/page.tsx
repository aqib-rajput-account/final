import { AdminControlCenter } from "@/components/admin/admin-control-center";

export default function ShuraMosquesPage() {
  return (
    <AdminControlCenter
      title="Mosque Network"
      description="Manage every mosque in the application, review network coverage, and keep mosque operations standardized across the platform."
      allowedEntityKeys={["mosques"]}
      initialEntityKey="mosques"
    />
  );
}
