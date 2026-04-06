import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const actorUserId = await resolveAuthenticatedUserId(request)
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = await params
    if (actorUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot apply safety controls to self' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body?.action === 'block' ? 'block' : body?.action === 'mute' ? 'mute' : null
    if (!action) {
      return NextResponse.json({ error: 'action must be block or mute' }, { status: 400 })
    }

    const supabase = await createClient()

    const table = action === 'block' ? 'user_blocks' : 'user_mutes'
    const payload =
      action === 'block'
        ? { blocker_id: actorUserId, blocked_id: targetUserId }
        : { muter_id: actorUserId, muted_id: targetUserId }

    const { error } = await supabase.from(table).insert(payload as any)
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action, targetUserId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const actorUserId = await resolveAuthenticatedUserId(request)
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = await params
    const action = request.nextUrl.searchParams.get('action')
    if (action !== 'block' && action !== 'mute') {
      return NextResponse.json({ error: 'action query parameter must be block or mute' }, { status: 400 })
    }

    const supabase = await createClient()

    const query =
      action === 'block'
        ? supabase.from('user_blocks').delete().eq('blocker_id', actorUserId).eq('blocked_id', targetUserId)
        : supabase.from('user_mutes').delete().eq('muter_id', actorUserId).eq('muted_id', targetUserId)

    const { error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action, targetUserId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
