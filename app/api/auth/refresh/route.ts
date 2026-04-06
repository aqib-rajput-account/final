import { NextResponse } from 'next/server'
import { refreshSession } from '@/backend/auth/service'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 })
    }

    const session = refreshSession(refreshToken)
    if (!session) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    }

    return NextResponse.json({ session })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
