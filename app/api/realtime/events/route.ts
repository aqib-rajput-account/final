import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { listRealtimeEventsSince } from '@/backend/realtime/service'

export async function GET(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
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

    return NextResponse.json({
      events,
      lastEventId: events.at(-1)?.eventId ?? lastSeenEventId ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
