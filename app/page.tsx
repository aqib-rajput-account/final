import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { HeroSection } from '@/components/home/hero-section'
import { FeaturesSection } from '@/components/home/features-section'
import { NearbyMosquesPreview } from '@/components/home/nearby-mosques-preview'
import { PrayerTimesWidget } from '@/components/home/prayer-times-widget'
import { UpcomingEventsPreview } from '@/components/home/upcoming-events-preview'
import { StatsSection } from '@/components/home/stats-section'
import { CTASection } from '@/components/home/cta-section'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NearbyMosquesPreview />
            </div>
            <div>
              <PrayerTimesWidget />
            </div>
          </div>
        </div>
        <UpcomingEventsPreview />
        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

