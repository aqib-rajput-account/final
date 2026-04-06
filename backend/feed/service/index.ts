import type {
  FeedCursorPayload,
  FeedFanoutMode,
  FeedItemRecord,
  FeedPageOptions,
  FeedPageResult,
  FeedPostRecord,
  FeedRepository,
  FeedVisibility,
} from './types'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const DEFAULT_STALE_AFTER_SECONDS = 300

function clampPageSize(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_PAGE_SIZE
  return Math.min(Math.floor(limit), MAX_PAGE_SIZE)
}

function toCursorPayloadFromItem(item: FeedItemRecord): FeedCursorPayload {
  return {
    score: item.score,
    postId: item.postId,
  }
}

export function encodeFeedCursor(cursor: FeedCursorPayload): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeFeedCursor(cursor: string | null | undefined): FeedCursorPayload | undefined {
  if (!cursor) return undefined
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as FeedCursorPayload
    if (!payload || typeof payload.score !== 'string' || typeof payload.postId !== 'string') {
      return undefined
    }

    return payload
  } catch {
    return undefined
  }
}

function isVisibleForAuthor(viewerId: string, authorId: string, visibility: FeedVisibility): boolean {
  if (viewerId === authorId) return true
  if (visibility === 'public') return true
  return false
}

async function canViewerSeePost(
  repo: FeedRepository,
  viewerId: string,
  post: FeedPostRecord
): Promise<boolean> {
  if (post.deletedAt) return false

  if (!isVisibleForAuthor(viewerId, post.authorId, post.visibility)) {
    if (post.visibility === 'followers') {
      const follows = await repo.isFollowing(viewerId, post.authorId)
      if (!follows) return false
    } else {
      return false
    }
  }

  if (await repo.isBlockedEitherWay(viewerId, post.authorId)) return false
  if (await repo.isMuted(viewerId, post.authorId)) return false

  return true
}

async function materializeForFollowerSet(
  repo: FeedRepository,
  post: FeedPostRecord,
  followerIds: string[]
): Promise<void> {
  const eligibleFeedItems: FeedItemRecord[] = []

  for (const followerId of followerIds) {
    if (!(await canViewerSeePost(repo, followerId, post))) continue
    eligibleFeedItems.push({
      userId: followerId,
      postId: post.id,
      actorId: post.authorId,
      score: post.createdAt,
      createdAt: new Date().toISOString(),
    })
  }

  if (eligibleFeedItems.length > 0) {
    await repo.insertFeedItems(eligibleFeedItems)
  }
}

async function recomputeMaterializedTimelineForViewer(
  repo: FeedRepository,
  viewerId: string,
  limit: number
): Promise<void> {
  const followedAuthorIds = await repo.listFollowedAuthorIds(viewerId)
  if (followedAuthorIds.length === 0) {
    await repo.clearMaterializedFeedForUser(viewerId)
    await repo.setTimelineUpdatedAt(viewerId, new Date().toISOString())
    return
  }

  const candidatePosts = await repo.listPostsForAuthors({
    authorIds: followedAuthorIds,
    limit,
  })

  const itemsToInsert: FeedItemRecord[] = []

  for (const post of candidatePosts) {
    if (!(await canViewerSeePost(repo, viewerId, post))) continue
    itemsToInsert.push({
      userId: viewerId,
      postId: post.id,
      actorId: post.authorId,
      score: post.createdAt,
      createdAt: new Date().toISOString(),
    })
  }

  await repo.clearMaterializedFeedForUser(viewerId)
  if (itemsToInsert.length > 0) {
    await repo.insertFeedItems(itemsToInsert)
  }
  await repo.setTimelineUpdatedAt(viewerId, new Date().toISOString())
}

async function fetchFanoutOnReadTimeline(
  repo: FeedRepository,
  viewerId: string,
  cursor: FeedCursorPayload | undefined,
  limit: number
): Promise<FeedItemRecord[]> {
  const followedAuthorIds = await repo.listFollowedAuthorIds(viewerId)
  if (followedAuthorIds.length === 0) return []

  const posts = await repo.listPostsForAuthors({
    authorIds: followedAuthorIds,
    cursor,
    limit: limit * 2,
  })

  const items: FeedItemRecord[] = []
  for (const post of posts) {
    if (!(await canViewerSeePost(repo, viewerId, post))) continue

    items.push({
      userId: viewerId,
      postId: post.id,
      actorId: post.authorId,
      score: post.createdAt,
      createdAt: post.createdAt,
    })

    if (items.length >= limit) break
  }

  return items
}

export async function publishPostToFeed(repo: FeedRepository, postId: string): Promise<FeedFanoutMode> {
  const post = await repo.getPostById(postId)
  if (!post || post.deletedAt) {
    throw new Error('Cannot fan-out post: post is missing or deleted')
  }

  const highFollower = await repo.isHighFollowerAccount(post.authorId)

  if (highFollower) {
    // Fan-out on read: timeline is computed at request time.
    return 'read'
  }

  // Fan-out on write: materialize to follower timelines.
  const followerIds = await repo.listFollowerIds(post.authorId)
  await materializeForFollowerSet(repo, post, followerIds)

  return 'write'
}

export async function removePostFromFeed(repo: FeedRepository, postId: string): Promise<void> {
  await repo.deleteFeedItemsByPostId(postId)
}

export async function getHomeFeedPage(repo: FeedRepository, options: FeedPageOptions): Promise<FeedPageResult> {
  const limit = clampPageSize(options.limit)
  const staleAfterSeconds = options.staleAfterSeconds ?? DEFAULT_STALE_AFTER_SECONDS
  const cursorPayload = decodeFeedCursor(options.cursor)

  let recomputed = false
  const isHighFollowerViewer = await repo.isHighFollowerAccount(options.viewerId)

  if (!isHighFollowerViewer) {
    const lastUpdated = await repo.getTimelineUpdatedAt(options.viewerId)
    const stale = !lastUpdated || Date.now() - Date.parse(lastUpdated) > staleAfterSeconds * 1000

    if (stale) {
      await recomputeMaterializedTimelineForViewer(repo, options.viewerId, Math.max(limit * 5, 200))
      recomputed = true
    }

    const materialized = await repo.listMaterializedFeedItems({
      userId: options.viewerId,
      cursor: cursorPayload,
      limit: limit + 1,
    })

    const pageItems = materialized.slice(0, limit)
    const next = materialized.length > limit ? materialized[limit - 1] : null

    return {
      items: pageItems,
      nextCursor: next ? encodeFeedCursor(toCursorPayloadFromItem(next)) : null,
      strategy: 'write',
      recomputed,
    }
  }

  const readComputed = await fetchFanoutOnReadTimeline(repo, options.viewerId, cursorPayload, limit + 1)
  const pageItems = readComputed.slice(0, limit)
  const next = readComputed.length > limit ? readComputed[limit - 1] : null

  return {
    items: pageItems,
    nextCursor: next ? encodeFeedCursor(toCursorPayloadFromItem(next)) : null,
    strategy: 'read',
    recomputed,
  }
}
