import { notFound } from 'next/navigation'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { ImamDetailView } from '@/components/mosques/imam-detail-view'
import { getMosqueById, getImamById } from '@/lib/data'

interface ImamPageProps {
  params: Promise<{ id: string; imamId: string }>
}

export async function generateMetadata({ params }: ImamPageProps) {
  const { id, imamId } = await params
  const mosque = getMosqueById(id)
  const imam = getImamById(imamId)
  
  if (!mosque || !imam) {
    return {
      title: 'Imam Not Found | MosqueConnect',
    }
  }

  return {
    title: `${imam.name} - ${imam.title} | ${mosque.name} | MosqueConnect`,
    description: imam.biography.substring(0, 160),
  }
}

export default async function ImamPage({ params }: ImamPageProps) {
  const { id, imamId } = await params
  const mosque = getMosqueById(id)
  const imam = getImamById(imamId)

  if (!mosque || !imam || imam.mosqueId !== id) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ImamDetailView imam={imam} mosque={mosque} />
      </main>
      <Footer />
    </div>
  )
}

