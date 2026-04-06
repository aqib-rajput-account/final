import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, last_seen_at, updated_at')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const metadata = {
      userId,
      lastSeenAt: profile.last_seen_at,
      profileUpdatedAt: profile.updated_at,
      note: 'Device-level session metadata is maintained by auth session service.',
    }

    return NextResponse.json({ metadata })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
