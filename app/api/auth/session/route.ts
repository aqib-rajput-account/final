import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { createSession } from '@/backend/auth/service'

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const device = {
      deviceId: String(body.deviceId ?? request.headers.get('x-device-id') ?? crypto.randomUUID()),
      appVersion: typeof body.appVersion === 'string' ? body.appVersion : undefined,
      platform: typeof body.platform === 'string' ? body.platform : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    }

    const session = createSession(userId, device)
    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
