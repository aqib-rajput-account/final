import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { enqueueWork } from '@/lib/infrastructure/queue'
import { canUsersInteract, enforceMultiScopeThrottle, getMutedAndBlockedUserIds } from '@/backend/safety/service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const supabase = createSupabaseAdmin()
    const userId = await resolveAuthenticatedUserId(request)

    const { data: rawComments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const comments = rawComments?.map((c: any) => ({
      ...c,
      content: c.content, // Map DB content directly
    }))

    if (!userId) {
      return NextResponse.json({ comments: comments ?? [] })
    }

    const hiddenUsers = await getMutedAndBlockedUserIds(supabase, userId)
    const filteredComments = (comments ?? []).filter((comment: any) => !hiddenUsers.has(comment.author_id))

    return NextResponse.json({ comments: filteredComments })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const supabase = createSupabaseAdmin()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const throttle = await enforceMultiScopeThrottle({
      request,
      userId,
      action: 'comment-create',
      windowSeconds: 60,
      accountLimit: 20,
      ipLimit: 80,
      deviceLimit: 50,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const { content, parent_comment_id } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
    if (post?.author_id && !(await canUsersInteract(supabase, userId, post.author_id))) {
      return NextResponse.json({ error: 'Interaction forbidden due to block settings' }, { status: 403 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: userId,
        content: content.trim(),
        parent_comment_id: parent_comment_id || null,
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment post comments_count explicitly
    const { data: p } = await supabase.from('posts').select('comments_count').eq('id', postId).single()
    if (p) await supabase.from('posts').update({ comments_count: (p.comments_count || 0) + 1 }).eq('id', postId)

    const idempotencyKey = await resolveIdempotencyKey(request, `comment-create:${userId}:${postId}:${comment.id}`)
    await publishRealtimeEvent({
      eventType: 'comment.created',
      entityType: 'comment',
      entityId: String(comment.id),
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: 'home',
      payload: {
        postId,
        commentId: comment.id,
        authorId: userId,
      },
    })

    await enqueueWork({
      queue: 'notifications',
      taskType: 'notifications.comment.created',
      payload: {
        postId,
        commentId: String(comment.id),
        actorUserId: userId,
      },
    })

    await enqueueWork({
      queue: 'counter-aggregation',
      taskType: 'counters.comment.created',
      payload: {
        postId,
        commentId: String(comment.id),
      },
    })

    return NextResponse.json({ comment, actor_user_id: userId }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
