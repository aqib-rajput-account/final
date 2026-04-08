import { NextRequest, NextResponse } from 'next/server'
import { markMessagesRead } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { messageIds?: string[]; message_ids?: string[] }
    const messageIds = Array.isArray(body.messageIds)
      ? body.messageIds
      : Array.isArray(body.message_ids)
        ? body.message_ids
        : []

    const conversation = await markMessagesRead({
      supabase,
      userId,
      conversationId: id,
      messageIds,
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    return handleMessagingError(error)
  }
}
