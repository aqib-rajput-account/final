import { NextRequest, NextResponse } from 'next/server'
import { getMessage } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const messageId = request.nextUrl.searchParams.get('id') ?? ''

    const message = await getMessage({
      supabase,
      userId,
      messageId,
    })

    return NextResponse.json({ message })
  } catch (error) {
    return handleMessagingError(error)
  }
}
