import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { EventsView } from '@/components/events/events-view'

export const metadata = {
  title: 'Events | MosqueConnect',
  description: 'Discover lectures, classes, community events, and programs at mosques near you.',
}

export default function EventsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Events & Programs
            </h1>
            <p className="mt-2 text-muted-foreground">
              Discover lectures, classes, community gatherings, and special programs at mosques.
            </p>
          </div>
          <EventsView />
        </div>
      </main>
      <Footer />
    </div>
  )
}

