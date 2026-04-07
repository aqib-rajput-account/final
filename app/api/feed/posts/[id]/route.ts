import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { canManageAllMosques, normalizeClerkRole } from '@/lib/auth/clerk-rbac'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { fetchNormalizedFeedPostById } from '@/lib/feed-utils'
import {
  getPrimaryLegacyImageUrl,
  MAX_FEED_ATTACHMENTS,
  mergeMetadataWithFeedAttachments,
  normalizeFeedAttachments,
} from '@/lib/feed/media'

export const dynamic = 'force-dynamic'

async function persistPostMedia(supabase: any, postId: string, attachments: ReturnType<typeof normalizeFeedAttachments>) {
  await supabase.from('post_media').delete().eq('post_id', postId)

  if (attachments.length === 0) {
    return
  }

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await fetchNormalizedFeedPostById(supabase, id, userId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { userId, orgRole } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = normalizeClerkRole(orgRole)

    const { data: currentPost, error: lookupError } = await supabase
      .from('posts')
      .select('id, author_id, metadata')
      .eq('id', id)
      .single()

    if (lookupError || !currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const canEdit = currentPost.author_id === userId || canManageAllMosques(role)
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    const rawMedia = body.media

    if (typeof body.content === 'string') updates.body = body.content.trim()
    if (typeof body.post_type === 'string') updates.post_type = body.post_type
    if (typeof body.category === 'string') updates.category = body.category
    if (typeof body.is_published === 'boolean') updates.is_published = body.is_published
    if (typeof body.visibility === 'string') updates.visibility = body.visibility

    if (rawMedia !== undefined) {
      if (Array.isArray(rawMedia) && rawMedia.length > MAX_FEED_ATTACHMENTS) {
        return NextResponse.json({ error: `You can upload up to ${MAX_FEED_ATTACHMENTS} attachments per post` }, { status: 400 })
      }

      const attachments = normalizeFeedAttachments(rawMedia)
      const metadata = mergeMetadataWithFeedAttachments(
        typeof body.metadata === 'object' && body.metadata !== null
          ? body.metadata
          : currentPost.metadata,
        attachments
      )

      updates.metadata = metadata
      updates.image_url = getPrimaryLegacyImageUrl(attachments)

      try {
        await persistPostMedia(supabase, id, attachments)
      } catch {
        // Metadata fallback already preserves attachments for reads.
      }
    } else if (typeof body.metadata === 'object' && body.metadata !== null) {
      updates.metadata = body.metadata
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-update:${userId}:${id}`)
    await publishRealtimeEvent({
      eventType: 'post.updated',
      entityType: 'post',
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: 'home',
      payload: {
        postId: id,
        authorId: currentPost.author_id,
      },
    })

    const post = await fetchNormalizedFeedPostById(supabase, id, userId)
    return NextResponse.json({ post })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { userId, orgRole } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = normalizeClerkRole(orgRole)

    const { data: currentPost, error: lookupError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', id)
      .single()

    if (lookupError || !currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const canDelete = currentPost.author_id === userId || canManageAllMosques(role)
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-delete:${userId}:${id}`)
    await publishRealtimeEvent({
      eventType: 'post.deleted',
      entityType: 'post',
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: 'home',
      payload: {
        postId: id,
        authorId: currentPost.author_id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
