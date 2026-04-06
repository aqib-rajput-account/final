import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserId } from "@/backend/auth/request-auth";
import { resolveIdempotencyKey } from "@/backend/realtime/idempotency";
import { publishRealtimeEvent } from "@/backend/realtime/service";
import { enforceRateLimit } from "@/lib/infrastructure/rate-limit";
import { enqueueWork } from "@/lib/infrastructure/queue";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();

    const { data: comments, error } = await supabase
      .from("post_comments")
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    const userId = await resolveAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit({
      namespace: "comment-write",
      identifier: userId,
      windowSeconds: 60,
      maxRequests: 20,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const { data: comment, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        author_id: userId,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `comment-create:${userId}:${postId}:${comment.id}`);
    await publishRealtimeEvent({
      eventType: "comment.created",
      entityType: "comment",
      entityId: String(comment.id),
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: "home",
      payload: {
        postId,
        commentId: comment.id,
      },
    });

    await enqueueWork({
      queue: "notifications",
      taskType: "notifications.comment.created",
      payload: {
        postId,
        commentId: String(comment.id),
        actorUserId: userId,
      },
    });

    await enqueueWork({
      queue: "counter-aggregation",
      taskType: "counters.comment.created",
      payload: {
        postId,
        commentId: String(comment.id),
      },
    });

    return NextResponse.json({ comment, actor_user_id: userId }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
