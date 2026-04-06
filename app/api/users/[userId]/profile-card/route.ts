import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { buildPublicProfileCard } from '@/backend/users/domain'
import { getCachedValue, setCachedValue } from '@/lib/infrastructure/cache'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const cached = await getCachedValue<Record<string, unknown>>('profile-card', userId)
    if (cached) {
      return NextResponse.json(
        { profile: cached },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            Vary: 'Accept-Encoding',
            'X-Cache': 'HIT',
          },
        }
      )
    }

    const supabase = createSupabaseAdmin()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, locale, metadata')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    const profileCard = buildPublicProfileCard(profile as Record<string, unknown>)
    await setCachedValue('profile-card', userId, profileCard, 300)

    return NextResponse.json(
      { profile: profileCard },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          Vary: 'Accept-Encoding',
          'X-Cache': 'MISS',
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
