import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { buildCacheKey, deleteCachedValue, getCachedValue, hashCacheKey, setCachedValue } from '@/lib/infrastructure/cache'
import { enqueueWork } from '@/lib/infrastructure/queue'
import { enforceMultiScopeThrottle, getMutedAndBlockedUserIds } from '@/backend/safety/service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const cursor = searchParams.get('cursor')
    const cacheKey = hashCacheKey(buildCacheKey([userId, limit, offset, cursor]))
    const cachedResponse = await getCachedValue<{
      data: unknown[]
      userLikes: string[]
      userBookmarks: string[]
      nextCursor: string | null
      totalCount: number | null
    }>('timeline', cacheKey)

    if (cachedResponse) {
      return NextResponse.json(cachedResponse, {
        headers: {
          'Cache-Control': 'private, max-age=20, stale-while-revalidate=60',
          'X-Cache': 'HIT',
        },
      })
    }

    const supabase = await createClient()
    const hiddenUsers = await getMutedAndBlockedUserIds(supabase, userId)

    let query = supabase
      .from('posts')
      .select(
        `
        id,
        content,
        image_url,
        post_type,
        category,
        metadata,
        visibility,
        is_published,
        created_at,
        updated_at,
        author_id,
        mosque_id,
        profiles:author_id(
          id,
          full_name,
          avatar_url,
          profession,
          role
        ),
        post_likes(count),
        post_comments(count)
      `,
        { count: 'exact' }
      )
      .eq('is_published', true)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })

    if (cursor) {
      query = query.lt('created_at', cursor).limit(limit)
    } else {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: posts, error: postsError, count } = await query

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    const formattedPosts =
      posts
        ?.filter((post: any) => !hiddenUsers.has(post.author_id))
        .map((post: any) => ({
          ...post,
          likes_count: post.post_likes?.[0]?.count || 0,
          comments_count: post.post_comments?.[0]?.count || 0,
        })) || []

    const postIds = formattedPosts.map((p: any) => p.id)
    let userLikes: string[] = []
    let userBookmarks: string[] = []

    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId)

      userLikes = likes?.map((l) => l.post_id) || []

      const { data: bookmarks } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId)

      userBookmarks = bookmarks?.map((b) => b.post_id) || []
    }

    const nextCursor = formattedPosts.length === limit ? formattedPosts[formattedPosts.length - 1]?.created_at ?? null : null

    const responsePayload = {
      data: formattedPosts,
      userLikes,
      userBookmarks,
      nextCursor,
      totalCount: count ?? null,
    }

    await setCachedValue('timeline', cacheKey, responsePayload, 20)

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'private, max-age=20, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const throttle = await enforceMultiScopeThrottle({
      request,
      userId,
      action: 'post-create',
      windowSeconds: 60,
      accountLimit: 15,
      ipLimit: 60,
      deviceLimit: 45,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfterSeconds: throttle.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(throttle.retryAfterSeconds),
          },
        }
      )
    }

    const body = await request.json()
    const { content, image_url, post_type, category, metadata, mosque_id, is_published, visibility } = body

    if (!content || String(content).trim().length === 0) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
    }

    const safeVisibility = visibility === 'private' || visibility === 'followers' ? visibility : 'public'

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: userId,
        content: String(content).trim(),
        image_url: image_url ?? null,
        post_type: post_type ?? 'text',
        category: category ?? 'general',
        metadata: metadata ?? {},
        mosque_id: mosque_id ?? null,
        is_published: is_published ?? true,
        visibility: safeVisibility,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-create:${userId}:${post.id}`)
    await publishRealtimeEvent({
      eventType: 'post.created',
      entityType: 'post',
      entityId: String(post.id),
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: safeVisibility === 'private' ? undefined : 'home',
      payload: {
        postId: post.id,
        authorId: userId,
        visibility: safeVisibility,
      },
    })

    await enqueueWork({
      queue: 'fanout',
      taskType: 'feed.post.created',
      payload: {
        postId: String(post.id),
        authorId: userId,
      },
    })

    await enqueueWork({
      queue: 'notifications',
      taskType: 'notifications.post.created',
      payload: {
        postId: String(post.id),
        actorUserId: userId,
      },
    })

    await enqueueWork({
      queue: 'counter-aggregation',
      taskType: 'counters.post.created',
      payload: {
        postId: String(post.id),
        actorUserId: userId,
      },
    })

    await deleteCachedValue('timeline', hashCacheKey(buildCacheKey([userId, 20, 0, null])))

    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
