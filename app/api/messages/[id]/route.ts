import { NextRequest, NextResponse } from 'next/server'
import { deleteMessage, updateMessage } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { content?: string }
    const message = await updateMessage({
      supabase,
      userId,
      messageId: id,
      content: body.content ?? '',
    })

    return NextResponse.json({ message })
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
    const message = await deleteMessage({
      supabase,
      userId,
      messageId: id,
    })

    return NextResponse.json({ message })
  } catch (error) {
    return handleMessagingError(error)
  }
}
