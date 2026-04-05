import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get online users (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString()
    
    const { data: onlineUsers, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, profession, role')
      .neq('id', user.id)
      .gte('last_seen_at', fiveMinutesAgo)
      .limit(10)
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('Error fetching online users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: onlineUsers || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
