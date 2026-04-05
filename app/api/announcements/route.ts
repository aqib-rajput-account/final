import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const mosque_id = searchParams.get("mosque_id");
    const priority = searchParams.get("priority");

    let query = supabase
      .from("announcements")
      .select(`
        *,
        mosque:mosques!mosque_id(id, name, image_url)
      `)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (mosque_id) {
      query = query.eq("mosque_id", mosque_id);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    // Filter out expired announcements
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data: announcements, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has staff role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "shura", "imam"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { mosque_id, title, content, priority, expires_at } = body;

    if (!mosque_id || !title || !content) {
      return NextResponse.json(
        { error: "Mosque, title, and content are required" },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({
        mosque_id,
        title,
        content,
        priority: priority || "normal",
        expires_at,
        created_by: user.id,
      })
      .select(`
        *,
        mosque:mosques!mosque_id(id, name, image_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
