import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserId } from "@/backend/auth/request-auth";
import { resolveIdempotencyKey } from "@/backend/realtime/idempotency";
import { publishRealtimeEvent } from "@/backend/realtime/service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const mosque_id = searchParams.get("mosque_id");

    let query = supabase
      .from("posts")
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role),
        mosque:mosques!mosque_id(id, name, image_url)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (mosque_id) {
      query = query.eq("mosque_id", mosque_id);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, mosque_id, image_url } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        content: content.trim(),
        mosque_id: mosque_id || null,
        image_url: image_url || null,
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-create:${userId}:${post.id}`);
    await publishRealtimeEvent({
      eventType: "post.created",
      entityType: "post",
      entityId: String(post.id),
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: "home",
      payload: {
        postId: post.id,
        authorId: userId,
      },
    });

    return NextResponse.json({ post, actor_user_id: userId }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
