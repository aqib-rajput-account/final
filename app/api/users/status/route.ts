import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Not authenticated - silently return success to avoid spamming errors
      return NextResponse.json({ success: false, reason: 'not_authenticated' })
    }

    // Update user's last_seen_at timestamp
    const { error } = await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id)

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
