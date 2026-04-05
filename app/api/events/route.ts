import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const mosque_id = searchParams.get("mosque_id");
    const upcoming = searchParams.get("upcoming") === "true";

    let query = supabase
      .from("events")
      .select(`
        *,
        mosque:mosques!mosque_id(id, name, image_url, city, state)
      `)
      .eq("is_published", true)
      .order("start_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (mosque_id) {
      query = query.eq("mosque_id", mosque_id);
    }

    if (upcoming) {
      query = query.gte("start_date", new Date().toISOString());
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events });
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
    const {
      mosque_id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      image_url,
      is_recurring,
      recurrence_pattern,
      max_attendees,
      registration_required,
    } = body;

    if (!mosque_id || !title || !start_date) {
      return NextResponse.json(
        { error: "Mosque, title, and start date are required" },
        { status: 400 }
      );
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        mosque_id,
        title,
        description,
        event_type: event_type || "general",
        start_date,
        end_date,
        location,
        image_url,
        is_recurring: is_recurring || false,
        recurrence_pattern,
        max_attendees,
        registration_required: registration_required || false,
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

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
