import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get posts with user and interaction data
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        image_url,
        post_type,
        category,
        metadata,
        created_at,
        updated_at,
        author_id,
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
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    const formattedPosts = posts?.map((post: any) => {
      const p = { ...post }
      p.likes_count = p.post_likes?.[0]?.count || 0
      p.comments_count = p.post_comments?.[0]?.count || 0
      return p
    }) || []

    // Get user's likes and bookmarks for these posts
    const postIds = posts?.map(p => p.id) || []
    let userLikes: string[] = []
    let userBookmarks: string[] = []

    if (postIds.length > 0) {
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', user.id)

      if (!likesError) {
        userLikes = likes?.map(l => l.post_id) || []
      }

      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', user.id)

      if (!bookmarksError) {
        userBookmarks = bookmarks?.map(b => b.post_id) || []
      }
    }

    return NextResponse.json({
      data: formattedPosts,
      userLikes,
      userBookmarks,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
