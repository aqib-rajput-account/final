import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { canManageAllMosques, normalizeClerkRole } from "@/lib/auth/clerk-rbac";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");
    const city = searchParams.get("city");
    const state = searchParams.get("state");

    let query = supabase
      .from("mosques")
      .select("*")
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`);
    }

    if (city) {
      query = query.eq("city", city);
    }

    if (state) {
      query = query.eq("state", state);
    }

    const { data: mosques, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mosques });
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
    const { userId, orgRole } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = normalizeClerkRole(orgRole);
    const canAutoVerify = canManageAllMosques(role);

    const body = await request.json();
    const {
      name,
      address,
      city,
      state,
      country,
      zip_code,
      latitude,
      longitude,
      phone,
      email,
      website,
      description,
      image_url,
      facilities,
      capacity,
      established_year,
    } = body;

    if (!name || !address || !city || !state) {
      return NextResponse.json(
        { error: "Name, address, city, and state are required" },
        { status: 400 }
      );
    }

    const { data: mosque, error } = await supabase
      .from("mosques")
      .insert({
        name,
        address,
        city,
        state,
        country: country || "USA",
        zip_code,
        latitude,
        longitude,
        phone,
        email,
        website,
        description,
        image_url,
        facilities,
        capacity,
        established_year,
        admin_id: userId,
        is_verified: canAutoVerify ? (body.is_verified ?? true) : false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mosque }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
