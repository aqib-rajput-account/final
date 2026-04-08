import { NextRequest, NextResponse } from 'next/server'
import { getConversation, hardDeleteConversation, updateConversationDetails } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const conversation = await getConversation({ supabase, userId, conversationId: id })
    return NextResponse.json({ conversation })
  } catch (error) {
    return handleMessagingError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as {
      name?: string | null
      imageUrl?: string | null
      image_url?: string | null
    }

    const conversation = await updateConversationDetails({
      supabase,
      userId,
      conversationId: id,
      name: body.name ?? null,
      imageUrl: body.imageUrl ?? body.image_url ?? null,
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    return handleMessagingError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const result = await hardDeleteConversation({ supabase, userId, conversationId: id })
    return NextResponse.json(result)
  } catch (error) {
    return handleMessagingError(error)
  }
}
