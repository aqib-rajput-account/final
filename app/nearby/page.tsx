import { Footer, Header } from "@/components/layout";
import { MosqueDirectory } from "@/components/mosques/mosque-directory";
import { getPublicDirectoryMosques } from "@/lib/mosques/public";

export const metadata = {
  title: "Nearby Mosques | MosqueConnect",
  description: "Find mosques near your current location and get directions instantly.",
};

export default async function NearbyMosquesPage() {
  const mosques = await getPublicDirectoryMosques(true, 200);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nearby Mosques</h1>
            <p className="mt-2 text-muted-foreground">
              Share your location to discover verified mosques close to you, compare distance, and
              open directions right away.
            </p>
          </div>
          <MosqueDirectory initialMosques={mosques} initialTab="nearby" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
