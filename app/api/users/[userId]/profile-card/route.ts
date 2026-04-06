import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { buildPublicProfileCard } from '@/backend/users/domain'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = createSupabaseAdmin()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, locale, metadata')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ profile: buildPublicProfileCard(profile as Record<string, unknown>) })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
