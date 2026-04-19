import { notFound } from "next/navigation";

import { Footer, Header } from "@/components/layout";
import { MosqueDetail } from "@/components/mosques/mosque-detail";
import { getPublicMosquePageData } from "@/lib/mosques/public";

interface MosquePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MosquePageProps) {
  const { id } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;

  if (!mosque) {
    return {
      title: "Mosque Not Found | MosqueConnect",
    };
  }

  return {
    title: `${mosque.name} | MosqueConnect`,
    description: mosque.description || `Discover prayer times, events, and updates from ${mosque.name}.`,
  };
}

export default async function MosquePage({ params }: MosquePageProps) {
  const { id } = await params;
  const data = await getPublicMosquePageData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <MosqueDetail data={data} />
      </main>
      <Footer />
    </div>
  );
}
