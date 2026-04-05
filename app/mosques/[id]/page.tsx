import { notFound } from 'next/navigation'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { MosqueDetail } from '@/components/mosques/mosque-detail'
import { getMosqueById } from '@/lib/data'

interface MosquePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: MosquePageProps) {
  const { id } = await params
  const mosque = getMosqueById(id)
  
  if (!mosque) {
    return {
      title: 'Mosque Not Found | MosqueConnect',
    }
  }

  return {
    title: `${mosque.name} | MosqueConnect`,
    description: mosque.description,
  }
}

export default async function MosquePage({ params }: MosquePageProps) {
  const { id } = await params
  const mosque = getMosqueById(id)

  if (!mosque) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <MosqueDetail mosque={mosque} />
      </main>
      <Footer />
    </div>
  )
}

