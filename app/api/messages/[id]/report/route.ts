import { NextRequest, NextResponse } from 'next/server'
import { reportMessage } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const { id } = await params
    const body = await request.json().catch(() => ({})) as { reason?: string; details?: string | null }
    const result = await reportMessage({
      supabase,
      userId,
      messageId: id,
      reason: body.reason ?? '',
      details: body.details ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return handleMessagingError(error)
  }
}
