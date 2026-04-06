import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('post_bookmarks')
      .insert({ post_id: postId, user_id: userId })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already bookmarked', actor_user_id: userId })
      }
      throw error
    }

    return NextResponse.json({ success: true, actor_user_id: userId })
  } catch (error) {
    console.error('Error bookmarking post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, actor_user_id: userId })
  } catch (error) {
    console.error('Error unbookmarking post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
