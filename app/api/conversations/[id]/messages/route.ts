import { NextRequest, NextResponse } from 'next/server'
import { listMessages, sendMessage } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const { searchParams } = request.nextUrl

    const result = await listMessages({
      supabase,
      userId,
      conversationId: id,
      cursor: searchParams.get('cursor') ?? searchParams.get('before'),
      limit: Number(searchParams.get('limit') ?? '30'),
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleMessagingError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as {
      text?: string | null
      content?: string | null
      attachments?: unknown
      replyToId?: string | null
      reply_to_id?: string | null
    }

    const result = await sendMessage({
      supabase,
      request,
      userId,
      conversationId: id,
      text: body.text ?? body.content ?? null,
      attachments: body.attachments,
      replyToId: body.replyToId ?? body.reply_to_id ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return handleMessagingError(error)
  }
}
