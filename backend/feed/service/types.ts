export type FeedVisibility = 'public' | 'followers' | 'private'

export type FeedFanoutMode = 'write' | 'read'

export interface FeedPostRecord {
  id: string
  authorId: string
  createdAt: string
  deletedAt: string | null
  visibility: FeedVisibility
}

export interface FeedItemRecord {
  userId: string
  postId: string
  actorId: string
  score: string
  createdAt: string
}

export interface FeedCursorPayload {
  score: string
  postId: string
}

export interface FeedPageOptions {
  viewerId: string
  limit: number
  cursor?: string | null
  staleAfterSeconds?: number
}

export interface FeedPageResult {
  items: FeedItemRecord[]
  nextCursor: string | null
  strategy: FeedFanoutMode
  recomputed: boolean
}

export interface FeedRepository {
  // Author graph controls.
  isHighFollowerAccount(userId: string): Promise<boolean>
  listFollowerIds(userId: string): Promise<string[]>

  // Post lifecycle.
  getPostById(postId: string): Promise<FeedPostRecord | null>
  listPostsForAuthors(args: {
    authorIds: string[]
    cursor?: FeedCursorPayload
    limit: number
  }): Promise<FeedPostRecord[]>

  // Materialized timeline (fan-out on write path).
  insertFeedItems(items: FeedItemRecord[]): Promise<void>
  deleteFeedItemsByPostId(postId: string): Promise<void>
  listMaterializedFeedItems(args: {
    userId: string
    cursor?: FeedCursorPayload
    limit: number
  }): Promise<FeedItemRecord[]>

  // Safety + visibility checks.
  isFollowing(followerId: string, followeeId: string): Promise<boolean>
  isBlockedEitherWay(a: string, b: string): Promise<boolean>
  isMuted(viewerId: string, targetId: string): Promise<boolean>

  // Timeline freshness marker for recompute fallback.
  getTimelineUpdatedAt(userId: string): Promise<string | null>
  setTimelineUpdatedAt(userId: string, updatedAtIso: string): Promise<void>

  // Recompute support.
  clearMaterializedFeedForUser(userId: string): Promise<void>
  listFollowedAuthorIds(userId: string): Promise<string[]>
}
