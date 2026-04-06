import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { applyProfilePrivacy, writeAuditLog } from '@/backend/safety/service'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const safeProfile = await applyProfilePrivacy({
      supabase: supabase as any,
      viewerUserId: userId,
      profile: (profile ?? {}) as Record<string, unknown>,
    })

    return NextResponse.json({ profile: safeProfile })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()
    const body = await request.json()
    const { full_name, username, avatar_url, phone, bio, privacy_settings } = body

    const updateData: Record<string, unknown> = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (username !== undefined) updateData.username = username
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (phone !== undefined) updateData.phone = phone
    if (bio !== undefined) updateData.bio = bio
    if (privacy_settings && typeof privacy_settings === 'object') updateData.privacy_settings = privacy_settings

    const { data: profile, error } = await supabase.from('profiles').update(updateData).eq('id', userId).select().single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await writeAuditLog({
      supabase: supabase as any,
      actorUserId: userId,
      action: 'profile.update',
      targetType: 'profile',
      targetId: userId,
      metadata: {
        changedFields: Object.keys(updateData),
      },
    })

    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
