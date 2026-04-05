import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { PrayerTimesView } from '@/components/prayer-times/prayer-times-view'

export const metadata = {
  title: 'Prayer Times | MosqueConnect',
  description: 'Get accurate prayer times for your location or any mosque. View Fajr, Dhuhr, Asr, Maghrib, and Isha times.',
}

export default function PrayerTimesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Prayer Times
            </h1>
            <p className="mt-2 text-muted-foreground">
              View accurate prayer times based on your location or select a mosque for specific Iqama times.
            </p>
          </div>
          <PrayerTimesView />
        </div>
      </main>
      <Footer />
    </div>
  )
}

