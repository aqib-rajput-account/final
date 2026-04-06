import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserId } from "@/backend/auth/request-auth";
import { resolveIdempotencyKey } from "@/backend/realtime/idempotency";
import { publishRealtimeEvent } from "@/backend/realtime/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: post, error } = await supabase
      .from("posts")
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role),
        mosque:mosques!mosque_id(id, name, image_url)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await resolveAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, image_url } = body;

    const { data: existingPost, error: fetchError } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.author_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content.trim();
    if (image_url !== undefined) updateData.image_url = image_url;

    const { data: post, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-update:${userId}:${id}`);
    await publishRealtimeEvent({
      eventType: "post.updated",
      entityType: "post",
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: "home",
      payload: {
        postId: id,
        authorId: userId,
      },
    });

    return NextResponse.json({ post, actor_user_id: userId });
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
    const { id } = await params;
    const supabase = await createClient();
    const userId = await resolveAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingPost, error: fetchError } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.author_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const idempotencyKey = await resolveIdempotencyKey(request, `post-delete:${userId}:${id}`);
    await publishRealtimeEvent({
      eventType: "post.deleted",
      entityType: "post",
      entityId: id,
      actorUserId: userId,
      idempotencyKey,
      feedStreamId: "home",
      payload: {
        postId: id,
        authorId: userId,
      },
    });

    return NextResponse.json({ success: true, actor_user_id: userId });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
