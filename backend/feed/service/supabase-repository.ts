import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeedCursorPayload, FeedItemRecord, FeedPostRecord, FeedRepository } from './types'

type DbClient = SupabaseClient<any, 'public', any>

function toCursorFilter(query: any, cursor?: FeedCursorPayload) {
  if (!cursor) return query
  return query.or(`score.lt.${cursor.score},and(score.eq.${cursor.score},post_id.lt.${cursor.postId})`)
}

export class SupabaseFeedRepository implements FeedRepository {
  constructor(private readonly db: DbClient, private readonly highFollowerThreshold = 5000) {}

  async isHighFollowerAccount(userId: string): Promise<boolean> {
    const { data: override } = await this.db
      .from('feed_strategy_overrides')
      .select('strategy')
      .eq('user_id', userId)
      .maybeSingle()

    if (override?.strategy === 'read') return true
    if (override?.strategy === 'write') return false

    const { count } = await this.db
      .from('follows')
      .select('id', { head: true, count: 'exact' })
      .eq('followee_id', userId)

    return (count ?? 0) >= this.highFollowerThreshold
  }

  async listFollowerIds(userId: string): Promise<string[]> {
    const { data, error } = await this.db.from('follows').select('follower_id').eq('followee_id', userId)
    if (error) throw error
    return (data ?? []).map((row: any) => row.follower_id)
  }

  async getPostById(postId: string): Promise<FeedPostRecord | null> {
    const { data, error } = await this.db
      .from('posts')
      .select('id,author_id,created_at,visibility,deleted_at')
      .eq('id', postId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      id: String(data.id),
      authorId: data.author_id,
      createdAt: data.created_at,
      visibility: data.visibility,
      deletedAt: data.deleted_at,
    }
  }

  async listPostsForAuthors(args: {
    authorIds: string[]
    cursor?: FeedCursorPayload
    limit: number
  }): Promise<FeedPostRecord[]> {
    if (args.authorIds.length === 0) return []

    let query = this.db
      .from('posts')
      .select('id,author_id,created_at,visibility,deleted_at')
      .in('author_id', args.authorIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(args.limit)

    if (args.cursor) {
      query = query.or(
        `created_at.lt.${args.cursor.score},and(created_at.eq.${args.cursor.score},id.lt.${args.cursor.postId})`
      )
    }

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: any) => ({
      id: String(row.id),
      authorId: row.author_id,
      createdAt: row.created_at,
      visibility: row.visibility,
      deletedAt: row.deleted_at,
    }))
  }

  async insertFeedItems(items: FeedItemRecord[]): Promise<void> {
    if (items.length === 0) return
    const payload = items.map((item) => ({
      user_id: item.userId,
      actor_id: item.actorId,
      post_id: item.postId,
      score: item.score,
      created_at: item.createdAt,
    }))

    const { error } = await this.db.from('feed_items').upsert(payload, { onConflict: 'user_id,post_id' })
    if (error) throw error
  }

  async deleteFeedItemsByPostId(postId: string): Promise<void> {
    const { error } = await this.db.from('feed_items').delete().eq('post_id', postId)
    if (error) throw error
  }

  async listMaterializedFeedItems(args: {
    userId: string
    cursor?: FeedCursorPayload
    limit: number
  }): Promise<FeedItemRecord[]> {
    let query = this.db
      .from('feed_items')
      .select('user_id,post_id,actor_id,score,created_at')
      .eq('user_id', args.userId)
      .order('score', { ascending: false })
      .order('post_id', { ascending: false })
      .limit(args.limit)

    query = toCursorFilter(query, args.cursor)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: any) => ({
      userId: row.user_id,
      postId: String(row.post_id),
      actorId: row.actor_id,
      score: row.score,
      createdAt: row.created_at,
    }))
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
      .maybeSingle()

    if (error) throw error
    return Boolean(data)
  }

  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
      .limit(1)

    if (error) throw error
    return (data?.length ?? 0) > 0
  }

  async isMuted(viewerId: string, targetId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('mutes')
      .select('id')
      .eq('muter_id', viewerId)
      .eq('muted_id', targetId)
      .maybeSingle()

    if (error) throw error
    return Boolean(data)
  }

  async getTimelineUpdatedAt(userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('feed_timeline_state')
      .select('last_recomputed_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data?.last_recomputed_at ?? null
  }

  async setTimelineUpdatedAt(userId: string, updatedAtIso: string): Promise<void> {
    const { error } = await this.db.from('feed_timeline_state').upsert({
      user_id: userId,
      last_recomputed_at: updatedAtIso,
    })

    if (error) throw error
  }

  async clearMaterializedFeedForUser(userId: string): Promise<void> {
    const { error } = await this.db.from('feed_items').delete().eq('user_id', userId)
    if (error) throw error
  }

  async listFollowedAuthorIds(userId: string): Promise<string[]> {
    const { data, error } = await this.db.from('follows').select('followee_id').eq('follower_id', userId)
    if (error) throw error
    return (data ?? []).map((row: any) => row.followee_id)
  }
}
