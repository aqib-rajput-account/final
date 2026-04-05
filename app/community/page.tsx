import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { CommunityView } from '@/components/community/community-view'

export const metadata = {
  title: 'Community | MosqueConnect',
  description: 'Stay connected with your mosque community. View announcements, donation campaigns, and community updates.',
}

export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Community Hub
            </h1>
            <p className="mt-2 text-muted-foreground">
              Stay connected with announcements, donation campaigns, and community updates.
            </p>
          </div>
          <CommunityView />
        </div>
      </main>
      <Footer />
    </div>
  )
}

