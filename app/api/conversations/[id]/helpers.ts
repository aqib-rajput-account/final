import { NextRequest, NextResponse } from 'next/server'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function withConversationAction(
  request: NextRequest,
  params: Promise<{ id: string }>,
  action: (input: { conversationId: string; userId: string; supabase: Awaited<ReturnType<typeof requireMessagingSession>>['supabase'] }) => Promise<unknown>
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const result = await action({ conversationId: id, userId, supabase })
    return NextResponse.json(result)
  } catch (error) {
    return handleMessagingError(error)
  }
}
