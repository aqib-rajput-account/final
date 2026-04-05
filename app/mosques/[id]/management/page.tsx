import { notFound } from 'next/navigation'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { ManagementBodyView } from '@/components/mosques/management-body-view'
import { getMosqueById, getManagementByMosqueId } from '@/lib/data'

interface ManagementPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ManagementPageProps) {
  const { id } = await params
  const mosque = getMosqueById(id)
  
  if (!mosque) {
    return {
      title: 'Mosque Not Found | MosqueConnect',
    }
  }

  return {
    title: `Management Body | ${mosque.name} | MosqueConnect`,
    description: `Meet the management team and committee members of ${mosque.name}. Learn about their roles, responsibilities, and how to contact them.`,
  }
}

export default async function ManagementPage({ params }: ManagementPageProps) {
  const { id } = await params
  const mosque = getMosqueById(id)

  if (!mosque) {
    notFound()
  }

  const managementTeam = getManagementByMosqueId(id)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ManagementBodyView mosque={mosque} team={managementTeam} />
      </main>
      <Footer />
    </div>
  )
}

