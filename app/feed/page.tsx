import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { EnhancedSocialFeed } from '@/components/feed/enhanced-social-feed'
import { FeedErrorBoundary } from '@/components/feed/feed-error-boundary'

export const metadata = {
  title: 'Community Feed | Haya Al Al Falah',
  description: 'Stay connected with your Muslim community. Share posts, announcements, and connect with members.',
}

export default function FeedPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <FeedErrorBoundary>
            <EnhancedSocialFeed />
          </FeedErrorBoundary>
        </div>
      </main>
      <Footer />
    </div>
  )
}

