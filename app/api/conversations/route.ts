import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all conversations the user is part of
    const { data: userParticipations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, role, last_read_at, is_muted')
      .eq('user_id', user.id)

    if (participationsError) {
      console.error('Error fetching participations:', participationsError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!userParticipations || userParticipations.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const conversationIds = userParticipations.map(p => p.conversation_id)

    // Get conversation details
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false })

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Get last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conversation) => {
        const participation = userParticipations.find(p => p.conversation_id === conversation.id)

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('id, content, message_type, created_at, sender_id')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .gt('created_at', participation?.last_read_at || '1970-01-01')
          .neq('sender_id', user.id)

        // Get participants
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, role')
          .eq('conversation_id', conversation.id)

        // Get participant profiles separately to avoid RLS recursion
        const participantIds = participants?.map(p => p.user_id) || []
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', participantIds)

        const participantsWithProfiles = participants?.map(p => {
          const profile = profiles?.find(pr => pr.id === p.user_id)
          return {
            ...profile,
            role: p.role
          }
        }) || []

        return {
          ...conversation,
          role: participation?.role,
          is_muted: participation?.is_muted,
          last_message: lastMessage,
          unread_count: unreadCount || 0,
          participants: participantsWithProfiles
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithDetails })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, participant_ids, image_url } = body

    if (!type || !['direct', 'group', 'broadcast'].includes(type)) {
      return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 })
    }

    if (type === 'direct') {
      if (!participant_ids || participant_ids.length !== 1) {
        return NextResponse.json({ error: 'Direct conversations require exactly one other participant' }, { status: 400 })
      }
      
      const otherUserId = participant_ids[0]
      if (otherUserId === user.id) {
        return NextResponse.json({ error: 'Cannot start a direct conversation with yourself' }, { status: 400 })
      }

      // Efficiently check for existing direct conversation
      const { data: existing, error: checkError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations!inner(type)')
        .eq('user_id', user.id)
        .eq('conversations.type', 'direct')

      if (existing && existing.length > 0) {
        const myDirectConvIds = existing.map(e => e.conversation_id)
        
        const { data: common } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', myDirectConvIds)
          .maybeSingle()

        if (common) {
          // Fetch full conversation details to return
          const { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', common.conversation_id)
            .single()
            
          return NextResponse.json({ conversation: convData, existing: true })
        }
      }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        name: type === 'direct' ? null : name,
        type,
        image_url,
        created_by: user.id
      })
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Add participants (creator + invited)
    const allParticipants = [
      { conversation_id: conversation.id, user_id: user.id, role: 'admin' },
      ...(participant_ids || []).map((id: string) => ({
        conversation_id: conversation.id,
        user_id: id,
        role: 'member'
      }))
    ]

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(allParticipants)

    if (partError) {
      console.error('Error adding participants:', partError)
      // Cleanup the conversation if participants failed
      await supabase.from('conversations').delete().eq('id', conversation.id)
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 })
    }

    // Fetch the full conversation details to return (same logic as GET)
    const { data: fullConv, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ conversation }, { status: 201 })
    }

    // Get participants with profiles
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, role')
      .eq('conversation_id', conversation.id)

    const participantIds = participants?.map(p => p.user_id) || []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', participantIds)

    const participantsWithProfiles = participants?.map(p => {
      const profile = profiles?.find(pr => pr.id === p.user_id)
      return { ...profile, role: p.role }
    }) || []

    return NextResponse.json({ 
      conversation: {
        ...fullConv,
        participants: participantsWithProfiles,
        unread_count: 0
      } 
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
