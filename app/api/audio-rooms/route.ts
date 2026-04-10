import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStreamAudioRoom } from '@/lib/stream/audio-client'

/**
 * GET /api/audio-rooms
 * Returns live + scheduled rooms (most recent first)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audio_rooms')
      .select('*')
      .in('status', ['live', 'scheduled'])
      .order('status', { ascending: false }) // live first
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ rooms: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rooms'
    console.error('[audio-rooms GET] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/audio-rooms
 * Create a new Space room
 */
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      title: string
      topic?: string
      scheduled_at?: string
      is_recorded?: boolean
      max_speakers?: number
      host_name?: string
      host_avatar_url?: string
    }

    const { title, topic, scheduled_at, is_recorded, max_speakers, host_name, host_avatar_url } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Determine initial status
    const status = scheduled_at ? 'scheduled' : 'live'
    const started_at = scheduled_at ? null : new Date().toISOString()

    // Insert into Supabase first to get the room id
    const { data: room, error: insertError } = await supabase
      .from('audio_rooms')
      .insert({
        title: title.trim(),
        topic: topic?.trim() || null,
        host_id: userId,
        host_name: host_name || null,
        host_avatar_url: host_avatar_url || null,
        status,
        started_at,
        scheduled_at: scheduled_at || null,
        is_recorded: is_recorded ?? false,
        max_speakers: max_speakers ?? 10,
      })
      .select()
      .single()

    if (insertError || !room) {
      throw insertError ?? new Error('Failed to create room')
    }

    // Create Stream.io audio_room call (non-blocking if it fails — room still usable)
    try {
      await createStreamAudioRoom(room.id, userId)
      await supabase
        .from('audio_rooms')
        .update({ stream_call_id: room.id })
        .eq('id', room.id)
    } catch (streamError) {
      console.warn('[audio-rooms POST] Stream call creation failed (non-fatal):', streamError)
    }

    // Add host as participant
    await supabase.from('audio_room_participants').upsert({
      room_id: room.id,
      user_id: userId,
      user_name: host_name || null,
      avatar_url: host_avatar_url || null,
      role: 'host',
    })

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create room'
    console.error('[audio-rooms POST] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
