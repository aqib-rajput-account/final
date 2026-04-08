import { NextRequest, NextResponse } from 'next/server'
import { createConversation, listConversations } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'
import type { ConversationInboxFilter, ConversationType } from '@/lib/messages/types'

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { searchParams } = request.nextUrl
    const rawFolder = searchParams.get('folder')
    const folder =
      rawFolder === 'requests' || rawFolder === 'archived' || rawFolder === 'broadcast' || rawFolder === 'primary'
        ? (rawFolder as ConversationInboxFilter)
        : undefined

    const result = await listConversations({
      supabase,
      userId,
      folder,
      query: searchParams.get('q'),
      cursor: searchParams.get('cursor'),
      limit: Number(searchParams.get('limit') ?? '20'),
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleMessagingError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const body = await request.json().catch(() => ({})) as {
      type?: ConversationType
      name?: string | null
      participantIds?: string[]
      participant_ids?: string[]
      participantId?: string
      openerMessage?: string | null
      opener_message?: string | null
      imageUrl?: string | null
      image_url?: string | null
    }

    const participantIds = Array.isArray(body.participantIds)
      ? body.participantIds
      : Array.isArray(body.participant_ids)
        ? body.participant_ids
        : body.participantId
          ? [body.participantId]
          : []

    const conversation = await createConversation({
      supabase,
      request,
      userId,
      type: body.type ?? 'direct',
      participantIds,
      name: body.name ?? null,
      openerMessage: body.openerMessage ?? body.opener_message ?? null,
      imageUrl: body.imageUrl ?? body.image_url ?? null,
    })

    return NextResponse.json({ conversation, data: conversation }, { status: 201 })
  } catch (error) {
    return handleMessagingError(error)
  }
}
