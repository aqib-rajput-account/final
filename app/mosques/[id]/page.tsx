import { notFound } from 'next/navigation'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { MosqueDetail } from '@/components/mosques/mosque-detail'
import { createClient } from '@/lib/supabase/server'
import type { Mosque as DbMosque } from '@/lib/database.types'
import type { Mosque } from '@/lib/types'

interface MosquePageProps {
  params: Promise<{ id: string }>
}

function mapDbMosqueToViewModel(mosque: DbMosque): Mosque {
  return {
    id: mosque.id,
    name: mosque.name,
    address: mosque.address,
    city: mosque.city,
    state: mosque.state,
    country: mosque.country,
    zipCode: mosque.zip_code ?? '',
    latitude: mosque.latitude ?? 0,
    longitude: mosque.longitude ?? 0,
    phone: mosque.phone ?? '',
    email: mosque.email ?? '',
    website: mosque.website ?? undefined,
    description: mosque.description ?? '',
    imageUrl: mosque.image_url ?? '',
    facilities: mosque.facilities ?? [],
    capacity: mosque.capacity ?? 0,
    establishedYear: mosque.established_year ?? 0,
    isVerified: mosque.is_verified,
    adminId: mosque.admin_id ?? undefined,
    createdAt: mosque.created_at,
    updatedAt: mosque.updated_at,
  }
}

async function getMosqueFromDb(id: string): Promise<Mosque | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mosques')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return mapDbMosqueToViewModel(data)
}

export async function generateMetadata({ params }: MosquePageProps) {
  const { id } = await params
  const mosque = await getMosqueFromDb(id)

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
  const mosque = await getMosqueFromDb(id)

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
