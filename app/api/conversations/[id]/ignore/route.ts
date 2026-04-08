import { NextRequest } from 'next/server'
import { ignoreConversationRequest } from '@/backend/messages-core'
import { withConversationAction } from '../helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withConversationAction(request, params, ({ supabase, userId, conversationId }) =>
    ignoreConversationRequest({ supabase, userId, conversationId })
  )
}
