import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { canManageAllMosques, normalizeClerkRole } from '@/lib/auth/clerk-rbac'
import { resolveIdempotencyKey } from '@/backend/realtime/idempotency'
import { publishRealtimeEvent } from '@/backend/realtime/service'

export const dynamic = 'force-dynamic'

function isMissingColumnError(error: { message?: string } | null | undefined, column: string) {
  const message = error?.message ?? ''
  return message.includes(`Could not find the '${column}' column`) || message.includes(`column ${column} does not exist`)
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
      .select('id, author_id')
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

    if (typeof body.content === 'string') updates.content = body.content.trim()
    if (typeof body.image_url === 'string' || body.image_url === null) updates.image_url = body.image_url
    if (typeof body.post_type === 'string') updates.post_type = body.post_type
    if (typeof body.category === 'string') updates.category = body.category
    if (typeof body.is_published === 'boolean') updates.is_published = body.is_published
    if (typeof body.metadata === 'object' && body.metadata !== null) updates.metadata = body.metadata

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    let { data: post, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error && isMissingColumnError(error, 'content') && typeof body.content === 'string') {
      const legacyUpdates = { ...updates }
      delete legacyUpdates.content
      legacyUpdates.body = body.content.trim()
      const fallback = await supabase
        .from('posts')
        .update(legacyUpdates)
        .eq('id', id)
        .select('*')
        .single()
      post = fallback.data
      error = fallback.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Publish realtime event so other clients patch their cache immediately
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
        body: (updates.content as string | undefined) ?? (updates.body as string | undefined),
        image_url: updates.image_url,
      },
    })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Notify all clients to remove this post from their feed cache
    const idempotencyKey = await resolveIdempotencyKey(request, `feed-post-delete:${userId}:${id}`)
    await publishRealtimeEvent({
      eventType: 'post.deleted',
      entityType: 'post',
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: 'home',
      payload: { postId: id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
