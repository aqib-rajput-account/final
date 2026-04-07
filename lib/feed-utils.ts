import { canViewerAccessPostRecord } from '@/lib/feed-visibility'
import {
  extractFeedAttachmentsFromMetadata,
  getPrimaryLegacyImageUrl,
  normalizeFeedAttachments,
  type FeedMediaAttachment,
} from '@/lib/feed/media'

const FEED_SELECT_BASE = `
  id,
  __CONTENT_FIELD__,
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
  )
`

type FeedSelectMode = 'body' | 'content'

const FEED_POST_SELECTS: Record<FeedSelectMode, string> = {
  body: FEED_SELECT_BASE.replace('__CONTENT_FIELD__', 'body'),
  content: FEED_SELECT_BASE.replace('__CONTENT_FIELD__', 'content'),
}

export interface NormalizedFeedPost {
  id: string
  content: string
  created_at: string
  updated_at: string
  author_id: string
  image_url: string | null
  post_type: string | null
  category: string | null
  visibility: string | null
  is_published: boolean
  mosque_id: string | null
  metadata: Record<string, unknown>
  pinned_at: string | null
  media: FeedMediaAttachment[]
  likes_count: number
  comments_count: number
  profiles: {
    id: string | null
    full_name: string | null
    avatar_url: string | null
    profession: string | null
    role: string | null
  } | null
  viewer: {
    liked: boolean
    bookmarked: boolean
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function ensureObject(value: unknown): Record<string, unknown> {
  return isObject(value) ? { ...value } : {}
}

function normalizeProfile(profile: unknown) {
  const candidate = Array.isArray(profile) ? profile[0] : profile
  if (!candidate || typeof candidate !== 'object') return null

  const row = candidate as Record<string, unknown>
  return {
    id: typeof row.id === 'string' ? row.id : null,
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    profession: typeof row.profession === 'string' ? row.profession : null,
    role: typeof row.role === 'string' ? row.role : null,
  }
}

function mapCountRows(rows: Array<{ post_id: string | number }>) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const postId = String(row.post_id)
    counts.set(postId, (counts.get(postId) ?? 0) + 1)
  }

  return counts
}

function resolvePostContent(post: Record<string, unknown>) {
  if (typeof post.body === 'string') return post.body
  if (typeof post.content === 'string') return post.content
  return ''
}

function buildFeedSearchHaystack(post: Record<string, unknown>) {
  const metadata = ensureObject(post.metadata)
  const profile = normalizeProfile(post.profiles)
  const attachmentNames = normalizeFeedAttachments(metadata.attachments).map((attachment) => attachment.name ?? '')

  return [
    resolvePostContent(post),
    profile?.full_name ?? '',
    profile?.profession ?? '',
    typeof post.category === 'string' ? post.category : '',
    typeof post.post_type === 'string' ? post.post_type : '',
    attachmentNames.join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

async function fetchCommentRows(
  supabase: any,
  postIds: string[]
): Promise<Array<{ post_id: string | number }>> {
  const canonical = await supabase.from('comments').select('post_id').in('post_id', postIds)
  if (!canonical.error) {
    return canonical.data ?? []
  }

  const legacy = await supabase.from('post_comments').select('post_id').in('post_id', postIds)
  if (!legacy.error) {
    return legacy.data ?? []
  }

  return []
}

async function fetchPostMediaMap(supabase: any, postIds: string[]) {
  const response = await supabase
    .from('post_media')
    .select('id, post_id, media_type, media_url, sort_order, metadata')
    .in('post_id', postIds)
    .order('sort_order', { ascending: true })

  if (response.error) {
    return new Map<string, FeedMediaAttachment[]>()
  }

  const mediaByPostId = new Map<string, FeedMediaAttachment[]>()

  for (const row of response.data ?? []) {
    const attachment = normalizeFeedAttachments([
      {
        id: row.id,
        url: row.media_url,
        media_type: row.media_type,
        sort_order: row.sort_order,
        ...(isObject(row.metadata) ? row.metadata : {}),
      },
    ])[0]

    if (!attachment) continue

    const postId = String(row.post_id)
    const current = mediaByPostId.get(postId) ?? []
    current.push(attachment)
    mediaByPostId.set(postId, current)
  }

  return mediaByPostId
}

function deriveLegacyMedia(post: Record<string, unknown>) {
  const metadata = ensureObject(post.metadata)
  const attachments = extractFeedAttachmentsFromMetadata(metadata)
  if (attachments.length > 0) {
    return attachments
  }

  if (typeof post.image_url === 'string' && post.image_url.length > 0) {
    return [
      {
        id: null,
        url: post.image_url,
        kind: 'image' as const,
        mimeType: null,
        name: null,
        size: null,
        sortOrder: 0,
      },
    ]
  }

  return []
}

async function runFeedPostListQuery(args: {
  supabase: any
  mode: FeedSelectMode
  cursor: string | null
  limit: number
}) {
  const { supabase, mode, cursor, limit } = args

  let query = supabase
    .from('posts')
    .select(FEED_POST_SELECTS[mode])
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  return query
}

async function runFeedPostByIdQuery(supabase: any, postId: string, mode: FeedSelectMode) {
  return supabase.from('posts').select(FEED_POST_SELECTS[mode]).eq('id', postId).single()
}

export async function listFeedPostRows(args: {
  supabase: any
  cursor: string | null
  limit: number
}) {
  const primary = await runFeedPostListQuery({ ...args, mode: 'body' })
  if (!primary.error) {
    return primary.data ?? []
  }

  const fallback = await runFeedPostListQuery({ ...args, mode: 'content' })
  if (!fallback.error) {
    return fallback.data ?? []
  }

  throw primary.error ?? fallback.error
}

export async function fetchFeedPostRowById(supabase: any, postId: string) {
  const primary = await runFeedPostByIdQuery(supabase, postId, 'body')
  if (!primary.error && primary.data) {
    return primary.data as Record<string, unknown>
  }

  const fallback = await runFeedPostByIdQuery(supabase, postId, 'content')
  if (!fallback.error && fallback.data) {
    return fallback.data as Record<string, unknown>
  }

  return null
}

export async function fetchPostAccessRecordById(supabase: any, postId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, author_id, visibility, metadata, is_published')
    .eq('id', postId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Record<string, unknown>
}

export async function filterVisibleFeedPosts(
  supabase: any,
  posts: Array<Record<string, unknown>>,
  viewerId: string | null
) {
  if (posts.length === 0) return []

  const authorsRequiringFollowCheck = viewerId
    ? Array.from(
        new Set(
          posts
            .filter((post) => post.visibility === 'followers' && String(post.author_id ?? '') !== viewerId)
            .map((post) => String(post.author_id ?? ''))
            .filter(Boolean)
        )
      )
    : []

  let followedAuthorIds = new Set<string>()
  if (viewerId && authorsRequiringFollowCheck.length > 0) {
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', authorsRequiringFollowCheck)

    followedAuthorIds = new Set((data ?? []).map((row: { following_id: string | number }) => String(row.following_id)))
  }

  return posts.filter((post) => canViewerAccessPostRecord(post, viewerId, followedAuthorIds))
}

export async function canViewerAccessPost(
  supabase: any,
  post: Record<string, unknown>,
  viewerId: string | null
) {
  if (!viewerId) {
    return canViewerAccessPostRecord(post, null)
  }

  const authorId = String(post.author_id ?? '')
  if (post.visibility !== 'followers' || !authorId || authorId === viewerId) {
    return canViewerAccessPostRecord(post, viewerId)
  }

  const { data } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', viewerId)
    .eq('following_id', authorId)
    .maybeSingle()

  return canViewerAccessPostRecord(post, viewerId, new Set(data ? [authorId] : []))
}

export function matchesFeedSearchQuery(post: Record<string, unknown>, q: string | null) {
  if (!q) return true
  return buildFeedSearchHaystack(post).includes(q.trim().toLowerCase())
}

export async function enrichFeedPosts(
  supabase: any,
  posts: Array<Record<string, unknown>>,
  viewerId: string | null
) {
  const postIds = posts.map((post) => String(post.id))

  if (postIds.length === 0) {
    return {
      posts: [] as NormalizedFeedPost[],
      userLikes: [] as string[],
      userBookmarks: [] as string[],
    }
  }

  const [reactionRowsResult, bookmarkRowsResult, commentRows, mediaByPostId] = await Promise.all([
    supabase.from('reactions').select('post_id, user_id').in('post_id', postIds).eq('reaction_type', 'like'),
    viewerId
      ? supabase.from('post_bookmarks').select('post_id').in('post_id', postIds).eq('user_id', viewerId)
      : Promise.resolve({ data: [] as Array<{ post_id: string | number }>, error: null }),
    fetchCommentRows(supabase, postIds),
    fetchPostMediaMap(supabase, postIds),
  ])

  const reactionRows = reactionRowsResult.error ? [] : reactionRowsResult.data ?? []
  const bookmarkRows = bookmarkRowsResult.error ? [] : bookmarkRowsResult.data ?? []

  const likeCounts = mapCountRows(reactionRows)
  const commentCounts = mapCountRows(commentRows)
  const userLikeSet = new Set(
    viewerId
      ? reactionRows
          .filter((row: { user_id: string | number }) => String(row.user_id) === viewerId)
          .map((row: { post_id: string | number }) => String(row.post_id))
      : []
  )
  const userBookmarkSet = new Set(bookmarkRows.map((row: { post_id: string | number }) => String(row.post_id)))

  const normalizedPosts = posts.map((post) => {
    const postId = String(post.id)
    const metadata = ensureObject(post.metadata)
    const media = mediaByPostId.get(postId) ?? deriveLegacyMedia(post)

    return {
      id: postId,
      content: resolvePostContent(post),
      created_at: typeof post.created_at === 'string' ? post.created_at : new Date().toISOString(),
      updated_at:
        typeof post.updated_at === 'string'
          ? post.updated_at
          : typeof post.created_at === 'string'
            ? post.created_at
            : new Date().toISOString(),
      author_id: typeof post.author_id === 'string' ? post.author_id : '',
      image_url: getPrimaryLegacyImageUrl(media),
      post_type: typeof post.post_type === 'string' ? post.post_type : null,
      category: typeof post.category === 'string' ? post.category : null,
      visibility: typeof post.visibility === 'string' ? post.visibility : null,
      is_published: typeof post.is_published === 'boolean' ? post.is_published : true,
      mosque_id: typeof post.mosque_id === 'string' ? post.mosque_id : null,
      metadata,
      pinned_at: typeof metadata.pinned_at === 'string' ? metadata.pinned_at : null,
      media,
      likes_count:
        likeCounts.get(postId) ??
        (typeof post.likes_count === 'number' ? post.likes_count : 0),
      comments_count:
        commentCounts.get(postId) ??
        (typeof post.comments_count === 'number' ? post.comments_count : 0),
      profiles: normalizeProfile(post.profiles),
      viewer: {
        liked: userLikeSet.has(postId),
        bookmarked: userBookmarkSet.has(postId),
      },
    } satisfies NormalizedFeedPost
  })

  return {
    posts: normalizedPosts,
    userLikes: Array.from(userLikeSet),
    userBookmarks: Array.from(userBookmarkSet),
  }
}

export async function fetchNormalizedFeedPostById(
  supabase: any,
  postId: string,
  viewerId: string | null
) {
  const row = await fetchFeedPostRowById(supabase, postId)
  if (!row) {
    return null
  }

  const canView = await canViewerAccessPost(supabase, row, viewerId)
  if (!canView) {
    return null
  }

  const enriched = await enrichFeedPosts(supabase, [row], viewerId)
  return enriched.posts[0] ?? null
}
