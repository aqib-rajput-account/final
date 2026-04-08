import { NextRequest, NextResponse } from 'next/server'
import {
  addParticipantsToConversation,
  removeParticipant,
  updateParticipantRole,
} from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'
import type { ConversationParticipantRole } from '@/lib/messages/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { participantIds?: string[]; participant_ids?: string[] }
    const participantIds = Array.isArray(body.participantIds)
      ? body.participantIds
      : Array.isArray(body.participant_ids)
        ? body.participant_ids
        : []

    const conversation = await addParticipantsToConversation({
      supabase,
      userId,
      conversationId: id,
      participantIds,
    })

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
    const body = await request.json().catch(() => ({})) as { userId?: string; role?: ConversationParticipantRole }

    const conversation = await updateParticipantRole({
      supabase,
      userId,
      conversationId: id,
      targetUserId: body.userId ?? '',
      role: body.role === 'admin' ? 'admin' : 'member',
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
    const targetUserId = request.nextUrl.searchParams.get('userId') ?? ''

    const conversation = await removeParticipant({
      supabase,
      userId,
      conversationId: id,
      targetUserId,
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    return handleMessagingError(error)
  }
}
