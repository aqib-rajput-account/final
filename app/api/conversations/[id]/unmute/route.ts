import { NextRequest } from 'next/server'
import { unmuteConversation } from '@/backend/messages-core'
import { withConversationAction } from '../helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withConversationAction(request, params, ({ supabase, userId, conversationId }) =>
    unmuteConversation({ supabase, userId, conversationId })
  )
}
