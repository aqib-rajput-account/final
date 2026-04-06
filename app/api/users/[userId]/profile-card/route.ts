import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { buildPublicProfileCard } from '@/backend/users/domain'
import { getCachedValue, setCachedValue } from '@/lib/infrastructure/cache'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { applyProfilePrivacy, canUsersInteract } from '@/backend/safety/service'

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const viewerUserId = await resolveAuthenticatedUserId(request)

    if (!viewerUserId) {
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
    }

    const supabase = createSupabaseAdmin()

    if (viewerUserId && !(await canUsersInteract(supabase as any, viewerUserId, userId))) {
      return NextResponse.json({ error: 'Profile unavailable' }, { status: 404 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, locale, metadata, full_name, phone, email, privacy_settings')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    const sanitizedProfile = await applyProfilePrivacy({
      supabase: supabase as any,
      viewerUserId,
      profile: profile as Record<string, unknown>,
    })

    const profileCard = buildPublicProfileCard(sanitizedProfile)

    if (!viewerUserId) {
      await setCachedValue('profile-card', userId, profileCard, 300)
    }

    return NextResponse.json(
      { profile: profileCard },
      {
        headers: {
          'Cache-Control': viewerUserId ? 'private, max-age=30' : 'public, s-maxage=300, stale-while-revalidate=3600',
          'CDN-Cache-Control': viewerUserId ? 'private, max-age=30' : 'public, s-maxage=300, stale-while-revalidate=3600',
          Vary: 'Accept-Encoding',
          'X-Cache': 'MISS',
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
