import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { createClient } from '@/lib/supabase/server'
import { MessagingError } from '@/backend/messages-core'

export async function requireMessagingSession(request: Request) {
  const userId = await resolveAuthenticatedUserId(request)
  if (!userId) {
    throw new MessagingError('Unauthorized', 401, 'unauthorized')
  }

  const supabase = await createClient()
  return { supabase, userId }
}

export function handleMessagingError(error: unknown) {
  if (error instanceof MessagingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }

  console.error('Messaging route error:', error)
  return NextResponse.json({ error: 'Internal server error', code: 'internal_error' }, { status: 500 })
}
