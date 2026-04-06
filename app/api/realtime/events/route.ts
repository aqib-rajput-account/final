import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { listRealtimeEventsSince } from '@/backend/realtime/service'
import { getTraceIdFromRequest, logWithTrace, observeCounter, observeHistogram, withServerTiming } from '@/lib/infrastructure/observability'
import { evaluateTimelineLagAlert } from '@/lib/infrastructure/alerts'

export async function GET(request: Request) {
  const startedAt = Date.now()
  const traceId = getTraceIdFromRequest(request)
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
      observeCounter('realtime.events.errors.total', 1, { reason: 'unauthorized' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const lastSeenEventIdParam = url.searchParams.get('lastSeenEventId')
    const lastSeenEventId = lastSeenEventIdParam ? Number(lastSeenEventIdParam) : undefined
    const feedStreamId = url.searchParams.get('feedStreamId') ?? undefined
    const limit = Number(url.searchParams.get('limit') ?? 200)

    const events = await listRealtimeEventsSince({
      userId,
      lastSeenEventId: Number.isFinite(lastSeenEventId) ? lastSeenEventId : undefined,
      feedStreamId,
      limit,
    })

    const latestEvent = events.at(-1)
    if (latestEvent?.occurredAt) {
      evaluateTimelineLagAlert({
        traceId,
        feedStreamId: feedStreamId ?? 'home',
        lagMs: Math.max(0, Date.now() - Date.parse(latestEvent.occurredAt)),
      })
    }

    const timing = withServerTiming(startedAt)
    observeHistogram('realtime.catchup.latency_ms', timing.durationMs)
    logWithTrace({
      traceId,
      message: 'Realtime catch-up completed',
      tags: {
        userId,
        durationMs: timing.durationMs,
        eventCount: events.length,
        feedStreamId: feedStreamId ?? 'home',
      },
    })

    return NextResponse.json({
      events,
      lastEventId: events.at(-1)?.eventId ?? lastSeenEventId ?? 0,
    }, { headers: { 'X-Trace-Id': traceId } })
  } catch (error) {
    observeCounter('realtime.events.errors.total', 1, { reason: 'unexpected' })
    logWithTrace({
      level: 'error',
      message: 'Realtime catch-up failed',
      traceId,
      error,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
