import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const cursor = searchParams.get('cursor')

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
      posts?.map((post: any) => ({
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

    const nextCursor =
      formattedPosts.length === limit ? formattedPosts[formattedPosts.length - 1]?.created_at ?? null : null

    return NextResponse.json({
      data: formattedPosts,
      userLikes,
      userBookmarks,
      nextCursor,
      totalCount: count ?? null,
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

    const body = await request.json()
    const { content, image_url, post_type, category, metadata, mosque_id, is_published } = body

    if (!content || String(content).trim().length === 0) {
      return NextResponse.json({ error: 'Post content is required' }, { status: 400 })
    }

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
      feedStreamId: 'home',
      payload: {
        postId: post.id,
        authorId: userId,
      },
    })

    return NextResponse.json({ post, actor_user_id: userId }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
