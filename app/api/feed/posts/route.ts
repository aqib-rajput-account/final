import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
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
import { validateTimelineConsistency } from '@/lib/infrastructure/data-quality'
import { FEED_POST_SELECT, enrichFeedPosts, fetchNormalizedFeedPostById } from '@/lib/feed-utils'
import {
  getPrimaryLegacyImageUrl,
  isAnnouncementFeedPost,
  MAX_FEED_ATTACHMENTS,
  mergeMetadataWithFeedAttachments,
  normalizeFeedAttachments,
} from '@/lib/feed/media'

export const dynamic = 'force-dynamic'

type FeedFilter = 'all' | 'general' | 'announcements'

function resolveFeedFilter(searchParams: URLSearchParams): FeedFilter {
  const requestedFeed = searchParams.get('feed')
  if (requestedFeed === 'general' || requestedFeed === 'announcements' || requestedFeed === 'all') {
    return requestedFeed
  }

  const legacyCategory = searchParams.get('category')
  if (legacyCategory === 'announcement') return 'announcements'
  if (legacyCategory === 'general') return 'general'
  return 'all'
}

function matchesFeedFilter(post: { post_type?: string | null; metadata?: Record<string, unknown> | null }, feed: FeedFilter) {
  if (feed === 'announcements') return isAnnouncementFeedPost(post)
  if (feed === 'general') return !isAnnouncementFeedPost(post)
  return true
}

function normalizeSearchQuery(raw: string | null) {
  const trimmed = raw?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

async function persistPostMedia(supabase: any, postId: string, attachments: ReturnType<typeof normalizeFeedAttachments>) {
  if (attachments.length === 0) {
    await supabase.from('post_media').delete().eq('post_id', postId)
    return
  }

  await supabase.from('post_media').delete().eq('post_id', postId)

  const { error } = await supabase.from('post_media').insert(
    attachments.map((attachment, index) => ({
      post_id: postId,
      media_type: attachment.kind,
      media_url: attachment.url,
      sort_order: attachment.sortOrder ?? index,
      metadata: {
        mimeType: attachment.mimeType ?? null,
        name: attachment.name ?? null,
        size: attachment.size ?? null,
        pathname: attachment.pathname ?? null,
      },
    }))
  )

  if (error) {
    throw error
  }
}

async function fetchFilteredPosts(args: {
  supabase: any
  hiddenUsers: Set<string>
  feed: FeedFilter
  q: string | null
  cursor: string | null
  limit: number
}) {
  const { supabase, hiddenUsers, feed, q, cursor, limit } = args
  const batchSize = Math.min(Math.max(limit * 4, limit + 1), 80)
  const collected: Array<Record<string, unknown>> = []
  let nextQueryCursor = cursor
  let exhausted = false
  let loops = 0

  while (collected.length < limit + 1 && !exhausted && loops < 6) {
    loops += 1

    let query = supabase
      .from('posts')
      .select(FEED_POST_SELECT)
      .eq('is_published', true)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })
      .limit(batchSize)

    if (nextQueryCursor) {
      query = query.lt('created_at', nextQueryCursor)
    }

    if (q) {
      query = query.ilike('body', `%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const batch = (data ?? []) as Array<Record<string, unknown>>
    if (batch.length === 0) {
      exhausted = true
      break
    }

    for (const post of batch) {
      const authorId = String(post.author_id ?? '')
      if (hiddenUsers.has(authorId)) continue
      if (!matchesFeedFilter(post, feed)) continue
      collected.push(post)
      if (collected.length >= limit + 1) break
    }

    nextQueryCursor = typeof batch[batch.length - 1]?.created_at === 'string' ? String(batch[batch.length - 1].created_at) : null
    if (batch.length < batchSize) {
      exhausted = true
    }
  }

  const pagePosts = collected.slice(0, limit)
  const nextCursor = pagePosts.length === limit ? String(pagePosts[pagePosts.length - 1]?.created_at ?? '') || null : null

  return { pagePosts, nextCursor }
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const cursor = searchParams.get('cursor')
    const feed = resolveFeedFilter(searchParams)
    const q = normalizeSearchQuery(searchParams.get('q'))
    const supabase = await createClient()

    let hiddenUsers = new Set<string>()
    try {
      hiddenUsers = await getMutedAndBlockedUserIds(supabase, userId)
    } catch (error) {
      console.error('Safety check failed, falling back to empty blocklist', error)
    }

    const { pagePosts, nextCursor } = await fetchFilteredPosts({
      supabase,
      hiddenUsers,
      feed,
      q,
      cursor,
      limit,
    })

    const enriched = await enrichFeedPosts(supabase, pagePosts, userId)
    validateTimelineConsistency({ traceId, items: enriched.posts })

    const newestCreatedAt = enriched.posts[0]?.created_at
    if (newestCreatedAt) {
      evaluateTimelineLagAlert({
        traceId,
        feedStreamId: 'home',
        lagMs: Math.max(0, Date.now() - Date.parse(newestCreatedAt)),
      })
    }

    const timing = withServerTiming(startedAt)
    observeHistogram('feed.read.latency_ms', timing.durationMs, { cache: 'bypass' })
    logWithTrace({
      traceId,
      message: 'Feed timeline read completed',
      tags: {
        userId,
        durationMs: timing.durationMs,
        postCount: enriched.posts.length,
        feed,
        search: q ? 'present' : 'empty',
      },
    })

    return NextResponse.json(
      {
        data: enriched.posts,
        userLikes: enriched.userLikes,
        userBookmarks: enriched.userBookmarks,
        nextCursor,
        totalCount: null,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Trace-Id': traceId,
        },
      }
    )
  } catch (error: any) {
    observeCounter('feed.read.errors.total', 1, { reason: 'unexpected' })
    logWithTrace({
      level: 'error',
      message: 'Feed timeline read crashed',
      traceId,
      error,
    })
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
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
    const media = normalizeFeedAttachments(body.media)

    if (Array.isArray(body.media) && body.media.length > MAX_FEED_ATTACHMENTS) {
      observeCounter('feed.write.errors.total', 1, { reason: 'too_many_attachments' })
      return NextResponse.json({ error: `You can upload up to ${MAX_FEED_ATTACHMENTS} attachments per post` }, { status: 400 })
    }

    const trimmedContent = typeof body.content === 'string' ? body.content.trim() : ''
    if (!trimmedContent && media.length === 0) {
      observeCounter('feed.write.errors.total', 1, { reason: 'validation' })
      return NextResponse.json({ error: 'Post content or an attachment is required' }, { status: 400 })
    }

    const normalizedMetadata = mergeMetadataWithFeedAttachments(
      typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : null,
      media
    )
    const safeVisibility = body.visibility === 'private' || body.visibility === 'followers' ? body.visibility : 'public'
    const isAnnouncement = body.post_type === 'announcement'
    const inferredPostType = isAnnouncement
      ? 'announcement'
      : media[0]?.kind === 'video'
        ? 'video'
        : media[0]?.kind === 'image'
          ? 'image'
          : media[0]?.kind === 'file'
            ? 'file'
            : 'text'

    const { data: insertedPost, error } = await supabase
      .from('posts')
      .insert({
        author_id: userId,
        body: trimmedContent,
        image_url: getPrimaryLegacyImageUrl(media),
        post_type: inferredPostType,
        category: typeof body.category === 'string' ? body.category : isAnnouncement ? 'announcement' : 'general',
        metadata: normalizedMetadata,
        mosque_id: typeof body.mosque_id === 'string' ? body.mosque_id : null,
        is_published: typeof body.is_published === 'boolean' ? body.is_published : true,
        visibility: safeVisibility,
      })
      .select('id')
      .single()

    if (error || !insertedPost) {
      observeCounter('feed.write.errors.total', 1, { reason: 'insert_failed' })
      logWithTrace({ level: 'error', message: 'Post insert failed', traceId, error })
      return NextResponse.json({ error: error?.message || 'Failed to create post' }, { status: 500 })
    }

    try {
      await persistPostMedia(supabase, String(insertedPost.id), media)
    } catch (mediaError) {
      logWithTrace({
        level: 'warn',
        message: 'Post media persistence failed; relying on metadata fallback',
        traceId,
        error: mediaError,
      })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-create:${userId}:${insertedPost.id}`)
    await publishRealtimeEvent({
      eventType: 'post.created',
      entityType: 'post',
      entityId: String(insertedPost.id),
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: safeVisibility === 'private' ? undefined : 'home',
      payload: {
        postId: insertedPost.id,
        authorId: userId,
        visibility: safeVisibility,
        traceId,
        publishedAt: new Date().toISOString(),
      },
    })

    await enqueueWork({
      queue: 'fanout',
      taskType: 'feed.post.created',
      payload: {
        postId: String(insertedPost.id),
        authorId: userId,
      },
      traceId,
    })

    await enqueueWork({
      queue: 'notifications',
      taskType: 'notifications.post.created',
      payload: {
        postId: String(insertedPost.id),
        actorUserId: userId,
      },
      traceId,
    })

    await enqueueWork({
      queue: 'counter-aggregation',
      taskType: 'counters.post.created',
      payload: {
        postId: String(insertedPost.id),
        actorUserId: userId,
      },
      traceId,
    })

    const normalizedPost = await fetchNormalizedFeedPostById(supabase, String(insertedPost.id), userId)

    const timing = withServerTiming(startedAt)
    observeHistogram('feed.write.latency_ms', timing.durationMs, { operation: 'create_post' })
    logWithTrace({
      traceId,
      message: 'Post created and published',
      tags: { userId, postId: String(insertedPost.id), durationMs: timing.durationMs, mediaCount: media.length },
    })

    return NextResponse.json({ post: normalizedPost }, { status: 201, headers: { 'X-Trace-Id': traceId } })
  } catch (error: any) {
    observeCounter('feed.write.errors.total', 1, { reason: 'unexpected' })
    logWithTrace({
      level: 'error',
      message: 'Post creation crashed',
      traceId,
      error,
    })
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
