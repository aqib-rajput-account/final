import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserId } from "@/backend/auth/request-auth";
import { resolveIdempotencyKey } from "@/backend/realtime/idempotency";
import { publishRealtimeEvent } from "@/backend/realtime/service";
import { enforceRateLimit } from "@/lib/infrastructure/rate-limit";

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
      namespace: "post-like-write",
      identifier: userId,
      windowSeconds: 60,
      maxRequests: 40,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { data: existingLike } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (existingLike) {
      return NextResponse.json(
        { error: "Already liked" },
        { status: 400 }
      );
    }

    const { error: likeError } = await supabase
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: userId,
      });

    if (likeError) {
      return NextResponse.json({ error: likeError.message }, { status: 500 });
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-like:${userId}:${postId}`);
    await publishRealtimeEvent({
      eventType: "post.liked",
      entityType: "post",
      entityId: postId,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: "home",
      payload: {
        postId,
        liked: true,
      },
    });

    return NextResponse.json({ success: true, liked: true, actor_user_id: userId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      namespace: "post-like-write",
      identifier: userId,
      windowSeconds: 60,
      maxRequests: 40,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-unlike:${userId}:${postId}`);
    await publishRealtimeEvent({
      eventType: "post.unliked",
      entityType: "post",
      entityId: postId,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: "home",
      payload: {
        postId,
        liked: false,
      },
    });

    return NextResponse.json({ success: true, liked: false, actor_user_id: userId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
