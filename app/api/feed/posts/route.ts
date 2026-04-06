import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { buildCacheKey, deleteUserCacheEntries, getCachedValue, hashCacheKey, setCachedValue } from '@/lib/infrastructure/cache'
import { enqueueWork } from '@/lib/infrastructure/queue'
import { enforceMultiScopeThrottle, getMutedAndBlockedUserIds } from '@/backend/safety/service'
import {
  getTraceIdFromRequest,
  logWithTrace,
  observeCounter,
  observeHistogram,
  withServerTiming,
} from '@/lib/infrastructure/observability'
import { evaluateTimelineLagAlert } from '@/lib/infrastructure/alerts'
import { validateCounterParity, validateTimelineConsistency } from '@/lib/infrastructure/data-quality'

export const dynamic = 'force-dynamic'

function isMissingColumnError(error: { message?: string } | null | undefined, column: string) {
  const message = error?.message ?? ''
  return message.includes(`Could not find the '${column}' column`) || message.includes(`column ${column} does not exist`)
}

export async function GET(request: Request) {
  const startedAt = Date.now()
  const traceId = getTraceIdFromRequest(request)
  try {
    const { userId } = await auth()

    if (!userId) {
      observeCounter('feed.read.errors.total', 1, { reason: 'unauthorized' })
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
      const timing = withServerTiming(startedAt)
      observeHistogram('feed.read.latency_ms', timing.durationMs, { cache: 'hit' })
      logWithTrace({
        traceId,
        message: 'Feed timeline read served from cache',
        tags: { userId, durationMs: timing.durationMs, cache: 'hit' },
      })
      return NextResponse.json(cachedResponse, {
        headers: {
          'Cache-Control': 'private, max-age=20, stale-while-revalidate=60',
          'X-Cache': 'HIT',
          'X-Trace-Id': traceId,
        },
      })
    }

    const supabase = await createClient()
    const hiddenUsers = await getMutedAndBlockedUserIds(supabase, userId)

    const buildQuery = (legacyColumns = false) => {
      const contentColumn = legacyColumns ? 'body' : 'content'
      const likesColumn = legacyColumns ? 'like_count' : 'likes_count'
      const commentsColumn = legacyColumns ? 'comment_count' : 'comments_count'
      return supabase
        .from('posts')
        .select(
          `
          id,
          ${contentColumn},
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
          ${likesColumn},
          ${commentsColumn},
          profiles:author_id(
            id,
            full_name,
            avatar_url,
            profession,
            role
          )
        `,
          { count: 'exact' }
        )
        .eq('is_published', true)
        .in('visibility', ['public', 'followers'])
        .order('created_at', { ascending: false })
    }

    let legacyColumns = false
    let query = buildQuery(false)

    if (cursor) {
      query = query.lt('created_at', cursor).limit(limit)
    } else {
      query = query.range(offset, offset + limit - 1)
    }

    let { data: posts, error: postsError, count } = await query

    if (
      postsError &&
      (isMissingColumnError(postsError, 'content') ||
        isMissingColumnError(postsError, 'likes_count') ||
        isMissingColumnError(postsError, 'comments_count'))
    ) {
      legacyColumns = true
      let fallbackQuery = buildQuery(true)
      if (cursor) {
        fallbackQuery = fallbackQuery.lt('created_at', cursor).limit(limit)
      } else {
        fallbackQuery = fallbackQuery.range(offset, offset + limit - 1)
      }
      const fallbackResult = await fallbackQuery
      posts = fallbackResult.data
      postsError = fallbackResult.error
      count = fallbackResult.count
    }

    if (postsError) {
      observeCounter('feed.read.errors.total', 1, { reason: 'query_error' })
      logWithTrace({
        level: 'error',
        message: 'Feed timeline query failed',
        traceId,
        error: postsError,
      })
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    const formattedPosts =
      posts
        ?.filter((post: any) => !hiddenUsers.has(post.author_id))
        .map((post: any) => {
          const { content, body, likes_count, like_count, comments_count, comment_count, ...rest } = post
          return {
            ...rest,
            content: content ?? body ?? '',
            likes_count: likes_count ?? like_count ?? 0,
            comments_count: comments_count ?? comment_count ?? 0,
            visibility: rest.visibility === 'followers' || rest.visibility === 'private' ? rest.visibility : 'public', // Sanitize visibility
            legacyColumns,
          }
        }) || []

    const postIds = formattedPosts.map((p: any) => p.id)
    let userLikes: string[] = []
    let userBookmarks: string[] = []

    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('reactions') // Use 'reactions' as per migration
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId)
        .eq('reaction_type', 'like')

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

    validateTimelineConsistency({ traceId, items: formattedPosts })
    for (const post of formattedPosts) {
      validateCounterParity({
        traceId,
        likesCount: Number(post.likes_count ?? 0),
        commentCount: Number(post.comments_count ?? 0),
        likesEntries: Number(post.likes_count ?? 0),
      })
    }

    const newestCreatedAt = formattedPosts[0]?.created_at
    if (newestCreatedAt) {
      evaluateTimelineLagAlert({
        traceId,
        feedStreamId: 'home',
        lagMs: Math.max(0, Date.now() - Date.parse(newestCreatedAt)),
      })
    }

    await setCachedValue('timeline', cacheKey, responsePayload, 20, userId)

    const timing = withServerTiming(startedAt)
    observeHistogram('feed.read.latency_ms', timing.durationMs, { cache: 'miss' })
    logWithTrace({
      traceId,
      message: 'Feed timeline read completed',
      tags: {
        userId,
        durationMs: timing.durationMs,
        postCount: formattedPosts.length,
        cache: 'miss',
      },
    })

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'private, max-age=20, stale-while-revalidate=60',
        'X-Cache': 'MISS',
        'X-Trace-Id': traceId,
      },
    })
  } catch (error) {
    observeCounter('feed.read.errors.total', 1, { reason: 'unexpected' })
    logWithTrace({
      level: 'error',
      message: 'Feed timeline read crashed',
      traceId,
      error,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const traceId = getTraceIdFromRequest(request)
  try {
    const supabase = await createClient()
    const { userId } = await auth()

    if (!userId) {
      observeCounter('feed.write.errors.total', 1, { reason: 'unauthorized' })
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
      observeCounter('feed.write.errors.total', 1, { reason: 'rate_limited' })
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
    const { content, image_url, post_type, category, metadata, mosque_id, visibility } = body

    if (!content || String(content).trim().length === 0) {
      observeCounter('feed.write.errors.total', 1, { reason: 'validation' })
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
    }

    if (post_type === 'share' && !metadata?.shared_post_id) {
      observeCounter('feed.write.errors.total', 1, { reason: 'validation' })
      return NextResponse.json({ error: 'metadata.shared_post_id is required for share posts' }, { status: 400 })
    }

    const safeVisibility = visibility === 'private' || visibility === 'followers' ? visibility : 'public'

    const insertPayload = {
      author_id: userId,
      content: String(content).trim(),
      image_url: image_url ?? null,
      post_type: post_type ?? 'text',
      category: category ?? 'general',
      metadata: metadata ?? {},
      mosque_id: mosque_id ?? null,
      is_published: true,
      visibility: safeVisibility,
      likes_count: 0,
      comments_count: 0,
    }

    let { data: post, error } = await supabase
      .from('posts')
      .insert(insertPayload)
      .select('*')
      .single()

    if (
      error &&
      (isMissingColumnError(error, 'content') ||
        isMissingColumnError(error, 'likes_count') ||
        isMissingColumnError(error, 'comments_count'))
    ) {
      const legacyPayload = {
        author_id: userId,
        body: String(content).trim(),
        image_url: image_url ?? null,
        post_type: post_type ?? 'text',
        category: category ?? 'general',
        metadata: metadata ?? {},
        mosque_id: mosque_id ?? null,
        is_published: true,
        visibility: safeVisibility,
        like_count: 0,
        comment_count: 0,
      }
      const fallback = await supabase
        .from('posts')
        .insert(legacyPayload)
        .select('*')
        .single()
      post = fallback.data
      error = fallback.error
    }

    if (error) {
      observeCounter('feed.write.errors.total', 1, { reason: 'insert_failed' })
      logWithTrace({ level: 'error', message: 'Post insert failed', traceId, error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (safeVisibility === 'public' || safeVisibility === 'followers') {
      const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-create:${userId}:${post.id}`)
      void publishRealtimeEvent({
        eventType: 'post.created',
        entityType: 'post',
        entityId: String(post.id),
        actorUserId: userId,
        idempotencyKey,
        feedStreamId: 'home',
        payload: {
          postId: post.id,
          authorId: userId,
          visibility: safeVisibility,
          traceId,
          publishedAt: new Date().toISOString(),
        },
      })

      void enqueueWork({
        queue: 'fanout',
        taskType: 'feed.post.created',
        payload: {
          postId: String(post.id),
          authorId: userId,
        },
        traceId,
      })
    }

    await enqueueWork({
      queue: 'notifications',
      taskType: 'notifications.post.created',
      payload: {
        postId: String(post.id),
        actorUserId: userId,
      },
      traceId,
    })

    await enqueueWork({
      queue: 'counter-aggregation',
      taskType: 'counters.post.created',
      payload: {
        postId: String(post.id),
        actorUserId: userId,
      },
      traceId,
    })

    await deleteUserCacheEntries('timeline', userId)

    const timing = withServerTiming(startedAt)
    observeHistogram('feed.write.latency_ms', timing.durationMs, { operation: 'create_post' })
    logWithTrace({
      traceId,
      message: 'Post created and published',
      tags: { userId, postId: String(post.id), durationMs: timing.durationMs },
    })

    return NextResponse.json({ post }, { status: 201, headers: { 'X-Trace-Id': traceId } })
  } catch (error) {
    observeCounter('feed.write.errors.total', 1, { reason: 'unexpected' })
    logWithTrace({
      level: 'error',
      message: 'Post creation crashed',
      traceId,
      error,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
