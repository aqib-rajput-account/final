import { NextRequest, NextResponse } from 'next/server'
import { addReaction, removeReaction } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { emoji?: string }
    const message = await addReaction({
      supabase,
      userId,
      messageId: id,
      emoji: body.emoji ?? '',
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
    const emoji = request.nextUrl.searchParams.get('emoji') ?? ''
    const message = await removeReaction({
      supabase,
      userId,
      messageId: id,
      emoji,
    })

    return NextResponse.json({ message })
  } catch (error) {
    return handleMessagingError(error)
  }
}
