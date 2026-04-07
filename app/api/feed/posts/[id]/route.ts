import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveAuthenticatedUserId } from '@/backend/auth/request-auth'
import { canManageAllMosques, normalizeClerkRole } from '@/lib/auth/clerk-rbac'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'
import { getMutedAndBlockedUserIds } from '@/backend/safety/service'
import { fetchNormalizedFeedPostById } from '@/lib/feed-utils'
import { applyAudienceToMetadata, getSelectedViewerIds, normalizeStoredVisibility } from '@/lib/feed-visibility'
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

function normalizeAudiencePayload(
  requestedVisibility: unknown,
  metadata: Record<string, unknown>
) {
  const selectedViewerIds = getSelectedViewerIds(metadata)
  const audience =
    requestedVisibility === 'selected'
      ? 'selected'
      : requestedVisibility === 'private'
        ? 'private'
        : requestedVisibility === 'followers'
          ? 'followers'
          : 'public'

  if (audience === 'selected' && selectedViewerIds.length === 0) {
    return {
      error: 'Select at least one friend before sharing with selected friends',
    }
  }

  const audienceMetadata = applyAudienceToMetadata(metadata, audience, selectedViewerIds)

  return {
    audience,
    audienceMetadata,
    selectedViewerIds,
    storedVisibility: normalizeStoredVisibility(
      typeof requestedVisibility === 'string' ? requestedVisibility : 'public',
      audienceMetadata
    ),
  }
}

async function updatePostWithContentFallback(
  supabase: any,
  postId: string,
  updates: Record<string, unknown>,
  content: string | undefined
) {
  if (content === undefined) {
    const { error } = await supabase.from('posts').update(updates).eq('id', postId)
    if (error) throw error
    return
  }

  const primary = await supabase
    .from('posts')
    .update({
      ...updates,
      body: content,
    })
    .eq('id', postId)

  if (!primary.error) {
    return
  }

  const fallback = await supabase
    .from('posts')
    .update({
      ...updates,
      content,
    })
    .eq('id', postId)

  if (fallback.error) {
    throw primary.error ?? fallback.error
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const userId = await resolveAuthenticatedUserId(request)
    const hiddenUsers = userId ? await getMutedAndBlockedUserIds(supabase, userId).catch(() => new Set<string>()) : new Set<string>()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await fetchNormalizedFeedPostById(supabase, id, userId, hiddenUsers)
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
    const userId = await resolveAuthenticatedUserId(request)
    const { orgRole } = await auth()
    const hiddenUsers = userId ? await getMutedAndBlockedUserIds(supabase, userId).catch(() => new Set<string>()) : new Set<string>()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = normalizeClerkRole(orgRole)

    const { data: currentPost, error: lookupError } = await supabase
      .from('posts')
      .select('id, author_id, metadata, visibility')
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
    const contentUpdate = typeof body.content === 'string' ? body.content.trim() : undefined
    if (typeof body.post_type === 'string') updates.post_type = body.post_type
    if (typeof body.category === 'string') updates.category = body.category
    if (typeof body.is_published === 'boolean') updates.is_published = body.is_published
    const hasMetadataInput = typeof body.metadata === 'object' && body.metadata !== null
    let nextMetadata =
      hasMetadataInput
        ? (body.metadata as Record<string, unknown>)
        : (currentPost.metadata as Record<string, unknown> | null) ?? {}
    let nextAttachments = normalizeFeedAttachments(
      ((currentPost.metadata as Record<string, unknown> | null)?.attachments as unknown[]) ?? []
    )

    if (rawMedia !== undefined) {
      if (Array.isArray(rawMedia) && rawMedia.length > MAX_FEED_ATTACHMENTS) {
        return NextResponse.json({ error: `You can upload up to ${MAX_FEED_ATTACHMENTS} attachments per post` }, { status: 400 })
      }

      nextAttachments = normalizeFeedAttachments(rawMedia)
      nextMetadata = mergeMetadataWithFeedAttachments(nextMetadata, nextAttachments)
      updates.image_url = getPrimaryLegacyImageUrl(nextAttachments)

      try {
        await persistPostMedia(supabase, id, nextAttachments)
      } catch {
        // Metadata fallback already preserves attachments for reads.
      }
    }

    if (contentUpdate !== undefined && !contentUpdate && nextAttachments.length === 0) {
      return NextResponse.json({ error: 'Post content cannot be empty' }, { status: 400 })
    }

    if (rawMedia !== undefined || hasMetadataInput || typeof body.visibility === 'string') {
      const visibilityPayload = normalizeAudiencePayload(
        typeof body.visibility === 'string' ? body.visibility : currentPost.visibility,
        nextMetadata
      )

      if ('error' in visibilityPayload) {
        return NextResponse.json({ error: visibilityPayload.error }, { status: 400 })
      }

      updates.visibility = visibilityPayload.storedVisibility
      updates.metadata = visibilityPayload.audienceMetadata
    }

    if (Object.keys(updates).length === 0) {
      if (contentUpdate === undefined) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }
    }

    try {
      await updatePostWithContentFallback(supabase, id, updates, contentUpdate)
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'Failed to update post' }, { status: 500 })
    }

    const updatedMetadata = ((updates.metadata as Record<string, unknown> | undefined) ?? (currentPost.metadata as Record<string, unknown> | null)) ?? {}
    const updatedVisibility = typeof updates.visibility === 'string' ? updates.visibility : currentPost.visibility
    const selectedViewerIds = getSelectedViewerIds(updatedMetadata)
    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-update:${userId}:${id}`)
    await publishRealtimeEvent({
      eventType: 'post.updated',
      entityType: 'post',
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: updatedVisibility === 'public' ? 'home' : undefined,
      targetUserIds: selectedViewerIds.length > 0 ? selectedViewerIds : undefined,
      payload: {
        postId: id,
        authorId: currentPost.author_id,
        visibility: updatedVisibility,
      },
    })

    const post = await fetchNormalizedFeedPostById(supabase, id, userId, hiddenUsers)
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
    const userId = await resolveAuthenticatedUserId(request)
    const { orgRole } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = normalizeClerkRole(orgRole)

    const { data: currentPost, error: lookupError } = await supabase
      .from('posts')
      .select('id, author_id, visibility, metadata')
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

    const selectedViewerIds = getSelectedViewerIds(currentPost.metadata)
    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-delete:${userId}:${id}`)
    await publishRealtimeEvent({
      eventType: 'post.deleted',
      entityType: 'post',
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: currentPost.visibility === 'public' ? 'home' : undefined,
      targetUserIds: selectedViewerIds.length > 0 ? selectedViewerIds : undefined,
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
