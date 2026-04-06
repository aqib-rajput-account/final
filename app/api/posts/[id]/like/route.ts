import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { canUsersInteract, enforceMultiScopeThrottle } from '@/backend/safety/service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const throttle = await enforceMultiScopeThrottle({
      request,
      userId,
      action: 'post-like',
      windowSeconds: 60,
      accountLimit: 40,
      ipLimit: 120,
      deviceLimit: 80,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      )
    }

    const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
    if (post?.author_id && !(await canUsersInteract(supabase, userId, post.author_id))) {
      return NextResponse.json({ error: 'Interaction forbidden due to block settings' }, { status: 403 })
    }

    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 })
    }

    const { error: likeError } = await supabase.from('post_likes').insert({
      post_id: postId,
      user_id: userId,
    })

    if (likeError) {
      return NextResponse.json({ error: likeError.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-like:${userId}:${postId}`)
    await publishRealtimeEvent({
      eventType: 'post.liked',
      entityType: 'post',
      entityId: postId,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: 'home',
      payload: {
        postId,
        liked: true,
        actorUserId: userId,
      },
    })

    return NextResponse.json({ success: true, liked: true, actor_user_id: userId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const throttle = await enforceMultiScopeThrottle({
      request,
      userId,
      action: 'post-like',
      windowSeconds: 60,
      accountLimit: 40,
      ipLimit: 120,
      deviceLimit: 80,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      )
    }

    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-unlike:${userId}:${postId}`)
    await publishRealtimeEvent({
      eventType: 'post.unliked',
      entityType: 'post',
      entityId: postId,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: 'home',
      payload: {
        postId,
        liked: false,
        actorUserId: userId,
      },
    })

    return NextResponse.json({ success: true, liked: false, actor_user_id: userId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
