import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { buildPublicProfileCard } from '@/backend/users/domain'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids') ?? ''
    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50)

    if (ids.length === 0) {
      return NextResponse.json({ profiles: [] })
    }

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, locale, metadata')
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      profiles: (data ?? []).map((row) => buildPublicProfileCard(row as Record<string, unknown>)),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
