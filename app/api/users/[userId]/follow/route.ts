import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { enforceMultiScopeThrottle } from '@/backend/safety/service'
import { enqueueWork } from '@/lib/infrastructure/queue'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = await params

    const [{ count: followersCount }, { count: followingCount }, isFollowingResult] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
      supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle(),
    ])

    return NextResponse.json({
      followersCount: followersCount ?? 0,
      followingCount: followingCount ?? 0,
      isFollowing: Boolean(isFollowingResult.data),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = await params

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    const throttle = await enforceMultiScopeThrottle({
      request,
      userId: user.id,
      action: 'follow-write',
      windowSeconds: 60,
      accountLimit: 20,
      ipLimit: Number.MAX_SAFE_INTEGER,
      deviceLimit: Number.MAX_SAFE_INTEGER,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      )
    }

    const { error } = await supabase.from('user_follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    })

    if (error) {
      // Unique constraint violation — already following, treat as no-op
      if (error.code === '23505') {
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `follow-create:${user.id}:${targetUserId}`)
    await publishRealtimeEvent({
      eventType: 'follow.created',
      entityType: 'follow',
      entityId: `${user.id}:${targetUserId}`,
      actorUserId: user.id,
      targetUserIds: [targetUserId],
      idempotencyKey,
      payload: {
        followerId: user.id,
        followingId: targetUserId,
      },
    })

    await enqueueWork({
      queue: 'fanout',
      taskType: 'feed.follow.created',
      payload: {
        followerId: user.id,
        followingId: targetUserId,
      },
    })

    await enqueueWork({
      queue: 'notifications',
      taskType: 'notifications.follow.created',
      payload: {
        followerId: user.id,
        followingId: targetUserId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const throttle = await enforceMultiScopeThrottle({
      request,
      userId: user.id,
      action: 'follow-write',
      windowSeconds: 60,
      accountLimit: 20,
      ipLimit: Number.MAX_SAFE_INTEGER,
      deviceLimit: Number.MAX_SAFE_INTEGER,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      )
    }

    const { userId: targetUserId } = await params

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `follow-delete:${user.id}:${targetUserId}`)
    await publishRealtimeEvent({
      eventType: 'follow.deleted',
      entityType: 'follow',
      entityId: `${user.id}:${targetUserId}`,
      actorUserId: user.id,
      targetUserIds: [targetUserId],
      idempotencyKey,
      payload: {
        followerId: user.id,
        followingId: targetUserId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
