import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'

export default function AudioConferencesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        {children}
      </main>
      <Footer />
    </div>
  )
}
