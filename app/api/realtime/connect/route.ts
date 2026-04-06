import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { buildRealtimeChannels } from '@/backend/realtime/service'

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const feedStreamId = typeof body.feedStreamId === 'string' ? body.feedStreamId : undefined

    return NextResponse.json({
      userId,
      channels: buildRealtimeChannels({
        targetUserIds: [userId],
        feedStreamId,
      }),
      authenticatedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
