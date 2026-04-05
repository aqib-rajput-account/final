import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { MosqueDirectory } from '@/components/mosques/mosque-directory'
import { Spinner } from '@/components/ui/spinner'

export const metadata = {
  title: 'Mosque Directory | MosqueConnect',
  description: 'Browse and search mosques in your area. Find prayer times, facilities, and community events.',
}

export default function MosquesPage() {
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
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          }>
            <MosqueDirectory />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}

