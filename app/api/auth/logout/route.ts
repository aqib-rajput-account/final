import { NextResponse } from 'next/server'
import { invalidateAllUserSessions } from '@/backend/auth/service'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const version = invalidateAllUserSessions(userId)
    return NextResponse.json({ success: true, sessionVersion: version })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
