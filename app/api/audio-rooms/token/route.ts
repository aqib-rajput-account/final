import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createStreamUserToken, getStreamVideoConfig } from '@/lib/stream/audio-client'

/**
 * POST /api/audio-rooms/token
 * Returns a Stream Video token for the authenticated user
 */
export async function POST() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { apiKey } = getStreamVideoConfig()
    // Token valid for 6 hours
    const expiresAt = Math.floor(Date.now() / 1000) + 6 * 60 * 60
    const token = createStreamUserToken(userId, expiresAt)

    return NextResponse.json({ token, apiKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate token'
    console.error('[audio-rooms/token] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
