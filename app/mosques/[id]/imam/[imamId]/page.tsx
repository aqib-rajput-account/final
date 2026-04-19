import { notFound } from "next/navigation";

import { Footer, Header } from "@/components/layout";
import { PublicImamDetailView } from "@/components/mosques/public-detail-views";
import { getPublicMosquePageData } from "@/lib/mosques/public";

interface ImamPageProps {
  params: Promise<{ id: string; imamId: string }>;
}

export async function generateMetadata({ params }: ImamPageProps) {
  const { id, imamId } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;
  const imam = data?.imams.find((entry) => entry.id === imamId);
  
  if (!mosque || !imam) {
    return {
      title: "Imam Not Found | MosqueConnect",
    };
  }

  return {
    title: `${imam.name}${imam.title ? ` - ${imam.title}` : ""} | ${mosque.name} | MosqueConnect`,
    description: (imam.bio || `${imam.name} serves at ${mosque.name}.`).slice(0, 160),
  };
}

export default async function ImamPage({ params }: ImamPageProps) {
  const { id, imamId } = await params;
  const data = await getPublicMosquePageData(id);
  const mosque = data?.mosque;
  const imam = data?.imams.find((entry) => entry.id === imamId);

  if (!mosque || !imam || imam.mosque_id !== id) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PublicImamDetailView imam={imam} mosque={mosque} />
      </main>
      <Footer />
    </div>
  );
}

