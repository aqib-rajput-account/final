import { Header } from "@/components/layout";
import { Footer } from "@/components/layout";
import { MosqueDirectory } from "@/components/mosques/mosque-directory";
import { getPublicDirectoryMosques } from "@/lib/mosques/public";

export const metadata = {
  title: "Mosque Directory | MosqueConnect",
  description:
    "Browse and search mosques in your area. Find prayer times, facilities, and community events.",
};

interface MosquesPageProps {
  searchParams: Promise<{
    search?: string;
    tab?: string;
  }>;
}

export default async function MosquesPage({ searchParams }: MosquesPageProps) {
  const resolvedSearchParams = await searchParams;
  const mosques = await getPublicDirectoryMosques(true, 200);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Mosque Directory
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse all mosques or find ones near you. Get detailed information about facilities, prayer times, and events.
            </p>
          </div>
          <MosqueDirectory
            initialMosques={mosques}
            initialSearchQuery={resolvedSearchParams.search ?? ""}
            initialTab={resolvedSearchParams.tab === "nearby" ? "nearby" : "all"}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

