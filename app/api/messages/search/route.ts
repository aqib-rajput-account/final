import { NextRequest, NextResponse } from 'next/server'
import { searchMessages } from '@/backend/messages-core'
import { handleMessagingError, requireMessagingSession } from '@/backend/messages-http'

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await requireMessagingSession(request)
    const result = await searchMessages({
      supabase,
      userId,
      query: request.nextUrl.searchParams.get('q') ?? '',
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleMessagingError(error)
  }
}
