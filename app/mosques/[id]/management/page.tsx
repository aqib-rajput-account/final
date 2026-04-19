import { notFound } from "next/navigation";

import { Footer, Header } from "@/components/layout";
import { PublicManagementDirectoryView } from "@/components/mosques/public-detail-views";
import { getPublicMosquePageData } from "@/lib/mosques/public";

interface ManagementPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ManagementPageProps) {
  const { id } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;
  
  if (!mosque) {
    return {
      title: "Mosque Not Found | MosqueConnect",
    };
  }

  return {
    title: `Management Body | ${mosque.name} | MosqueConnect`,
    description: `Meet the management team and committee members of ${mosque.name}. Learn about their roles, responsibilities, and how to contact them.`,
  };
}

export default async function ManagementPage({ params }: ManagementPageProps) {
  const { id } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;

  if (!mosque) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PublicManagementDirectoryView mosque={mosque} teams={data.managementTeams} />
      </main>
      <Footer />
    </div>
  );
}

