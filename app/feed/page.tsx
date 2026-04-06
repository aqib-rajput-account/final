import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { EnhancedSocialFeed } from '@/components/feed/enhanced-social-feed'
import { FeedErrorBoundary } from '@/components/feed/feed-error-boundary'
import { Loader2 } from 'lucide-react'

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
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <EnhancedSocialFeed />
            </Suspense>
          </FeedErrorBoundary>
        </div>
      </main>
      <Footer />
    </div>
  )
}

