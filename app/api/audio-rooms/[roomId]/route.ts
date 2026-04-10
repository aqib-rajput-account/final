import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ roomId: string }>
}

/**
 * GET /api/audio-rooms/[roomId]
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { roomId } = await params

  try {
    const supabase = await createClient()

    const { data: room, error } = await supabase
      .from('audio_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get participants
    const { data: participants } = await supabase
      .from('audio_room_participants')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at', { ascending: true })

    return NextResponse.json({ room, participants: participants ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/audio-rooms/[roomId]
 * Update room status, title, etc. Host-only.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId } = await params

  try {
    const supabase = await createClient()

    // Verify ownership
    const { data: room } = await supabase
      .from('audio_rooms')
      .select('host_id, status')
      .eq('id', roomId)
      .single()

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.host_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      status?: string
      title?: string
      topic?: string
      is_recorded?: boolean
      recording_url?: string
    }

    const updates: Record<string, unknown> = {}
    if (body.title) updates.title = body.title.trim()
    if (body.topic !== undefined) updates.topic = body.topic?.trim() || null
    if (body.is_recorded !== undefined) updates.is_recorded = body.is_recorded
    if (body.recording_url) updates.recording_url = body.recording_url

    // Status transitions
    if (body.status === 'live' && room.status !== 'live') {
      updates.status = 'live'
      updates.started_at = new Date().toISOString()
    } else if (body.status === 'ended' && room.status !== 'ended') {
      updates.status = 'ended'
      updates.ended_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('audio_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ room: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/audio-rooms/[roomId]
 * Host ends and deletes the room.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId } = await params

  try {
    const supabase = await createClient()

    const { data: room } = await supabase
      .from('audio_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single()

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    if (room.host_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Mark ended instead of hard delete (preserve recordings)
    await supabase
      .from('audio_rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', roomId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
