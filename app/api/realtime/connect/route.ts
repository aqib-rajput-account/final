import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { buildRealtimeChannels } from '@/backend/realtime/service'
import { getTraceIdFromRequest, logWithTrace, observeCounter } from '@/lib/infrastructure/observability'

export async function POST(request: Request) {
  const traceId = getTraceIdFromRequest(request)
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
      observeCounter('realtime.connect.errors.total', 1, { reason: 'unauthorized' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const feedStreamId = typeof body.feedStreamId === 'string' ? body.feedStreamId : undefined

    const channels = buildRealtimeChannels({
      targetUserIds: [userId],
      feedStreamId,
    })
    logWithTrace({
      message: 'Realtime connection authenticated',
      traceId,
      tags: {
        userId,
        channelCount: channels.length,
        feedStreamId: feedStreamId ?? 'home',
      },
    })

    return NextResponse.json({
      userId,
      channels,
      authenticatedAt: new Date().toISOString(),
    }, { headers: { 'X-Trace-Id': traceId } })
  } catch (error) {
    observeCounter('realtime.connect.errors.total', 1, { reason: 'unexpected' })
    logWithTrace({
      level: 'error',
      message: 'Realtime connection failed',
      traceId,
      error,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
