import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { enqueueWork } from '@/lib/infrastructure/queue'
import { canUsersInteract, enforceMultiScopeThrottle, getMutedAndBlockedUserIds } from '@/backend/safety/service'
import { canViewerAccessPost, fetchPostAccessRecordById } from '@/lib/feed-utils'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

type NormalizedComment = {
  id: string
  content: string
  created_at: string
  updated_at?: string
  author_id: string
  author?: {
    id: string | null
    full_name: string | null
    avatar_url: string | null
    role: string | null
  } | null
}

function normalizeCommentRow(row: Record<string, any>): NormalizedComment {
  const author = Array.isArray(row.author) ? row.author[0] : row.author
  return {
    id: String(row.id),
    content: typeof row.body === 'string' ? row.body : typeof row.content === 'string' ? row.content : '',
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    author_id: String(row.author_id),
    author: author
      ? {
          id: typeof author.id === 'string' ? author.id : null,
          full_name: typeof author.full_name === 'string' ? author.full_name : null,
          avatar_url: typeof author.avatar_url === 'string' ? author.avatar_url : null,
          role: typeof author.role === 'string' ? author.role : null,
        }
      : null,
  }
}

function normalizeCommentFingerprintValue(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeCommentFingerprintTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return ''
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return value.slice(0, 19)
  }
  return new Date(parsed).toISOString().slice(0, 19)
}

function buildCommentFingerprint(row: Record<string, any>) {
  const postId = typeof row.post_id === 'string' || typeof row.post_id === 'number' ? String(row.post_id) : ''
  const authorId = typeof row.author_id === 'string' || typeof row.author_id === 'number' ? String(row.author_id) : ''
  const content = normalizeCommentFingerprintValue(typeof row.body === 'string' ? row.body : row.content)
  const createdAt = normalizeCommentFingerprintTime(row.created_at)

  if (postId && authorId && content && createdAt) {
    return `comment:${postId}:${authorId}:${content}:${createdAt}`
  }

  return `comment-id:${String(row.id ?? '')}`
}

async function fetchComments(supabase: any, postId: string): Promise<NormalizedComment[]> {
  let socialClient = supabase
  try {
    socialClient = createSupabaseAdmin()
  } catch {
    // fall back to the request-scoped client
  }

  const canonical = await socialClient
    .from('comments')
    .select(`
      *,
      author:profiles!author_id(id, full_name, avatar_url, role)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  const legacy = await socialClient
    .from('post_comments')
    .select(`
      *,
      author:profiles!author_id(id, full_name, avatar_url, role)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  const merged = [
    ...(!canonical.error
      ? (canonical.data ?? []).map((row: Record<string, any>) => ({
          ...normalizeCommentRow(row),
          _key: buildCommentFingerprint(row),
        }))
      : []),
    ...(!legacy.error
      ? (legacy.data ?? []).map((row: Record<string, any>) => ({
          ...normalizeCommentRow(row),
          _key: buildCommentFingerprint(row),
        }))
      : []),
  ]

  return merged
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))
    .filter((comment, index, array) => array.findIndex((candidate) => candidate._key === comment._key) === index)
    .map(({ _key, ...comment }) => comment)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)
    const post = await fetchPostAccessRecordById(supabase, postId)

    if (!post || !(await canViewerAccessPost(supabase, post, userId))) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comments = await fetchComments(supabase, postId)

    if (userId) {
      const hiddenUsers = await getMutedAndBlockedUserIds(supabase, userId)
      return NextResponse.json({ comments: comments.filter((comment: NormalizedComment) => !hiddenUsers.has(comment.author_id)) })
    }

    return NextResponse.json({ comments })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

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

    const post = await fetchPostAccessRecordById(supabase, postId)
    if (!post || !(await canViewerAccessPost(supabase, post, userId))) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.author_id && !(await canUsersInteract(supabase, userId, String(post.author_id)))) {
      return NextResponse.json({ error: 'Interaction forbidden due to block settings' }, { status: 403 })
    }

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    let socialClient = supabase
    try {
      socialClient = createSupabaseAdmin()
    } catch {
      // fall back to the request-scoped client
    }

    const canonicalInsert = await socialClient
      .from('comments')
      .insert({
        post_id: postId,
        author_id: userId,
        body: content,
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single()

    let commentRow = canonicalInsert.data
    let commentError = canonicalInsert.error

    if (commentError) {
      const legacyInsert = await socialClient
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content,
        })
        .select(`
          *,
          author:profiles!author_id(id, full_name, avatar_url, role)
        `)
        .single()

      commentRow = legacyInsert.data
      commentError = legacyInsert.error
    }

    if (commentError || !commentRow) {
      return NextResponse.json({ error: commentError?.message || 'Failed to create comment' }, { status: 500 })
    }

    const comment = normalizeCommentRow(commentRow as Record<string, any>)
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
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
