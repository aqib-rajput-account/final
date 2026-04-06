import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
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
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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

    return NextResponse.json({
      data: formattedPosts,
      userLikes,
      userBookmarks,
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

    return NextResponse.json({ post, actor_user_id: userId }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
