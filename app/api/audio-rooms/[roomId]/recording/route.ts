import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ roomId: string }>
}

/**
 * POST /api/audio-rooms/[roomId]/recording
 * Called by Stream.io webhook when recording is ready.
 * Also supports a direct call from the client with a recording URL.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { roomId } = await params

  try {
    const body = await request.json() as {
      recording_url?: string
      // Stream webhook shape
      call_recording?: { url?: string; filename?: string }
    }

    const recordingUrl =
      body.recording_url ||
      body.call_recording?.url ||
      null

    if (!recordingUrl) {
      return NextResponse.json({ error: 'recording_url is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('audio_rooms')
      .update({ recording_url: recordingUrl, is_recorded: true })
      .eq('id', roomId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save recording'
    console.error('[audio-rooms/recording] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
