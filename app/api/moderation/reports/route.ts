import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeClerkRole } from '@/lib/auth/clerk-rbac'
import { enqueueWork } from '@/lib/infrastructure/queue'

const MODERATOR_ROLES = new Set(['admin', 'super_admin', 'shura'])

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { postId, commentId, reason, details } = body

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    }

    if (!postId && !commentId) {
      return NextResponse.json({ error: 'Either postId or commentId is required' }, { status: 400 })
    }

    const { data: report, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: userId,
        post_id: postId ?? null,
        comment_id: commentId ?? null,
        reason,
        details: details ?? null,
        status: 'open',
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('moderation_queue').insert({
      report_id: report.id,
      status: 'queued',
      priority: 'normal',
    })

    await enqueueWork({
      queue: 'moderation',
      taskType: 'moderation.report.created',
      payload: {
        reportId: String(report.id),
        reporterId: userId,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, orgRole } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = normalizeClerkRole(orgRole)
    if (!role || !MODERATOR_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'queued'

    const { data, error } = await supabase
      .from('moderation_queue')
      .select('*, report:content_reports(*)')
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ queue: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
