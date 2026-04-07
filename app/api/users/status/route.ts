import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ success: false, reason: 'not_authenticated' })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error updating status:', error)
      return NextResponse.json({ success: false, reason: error.message })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ success: false, reason: 'internal_error' })
  }
}
