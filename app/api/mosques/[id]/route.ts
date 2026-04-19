import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { canManageMosque, normalizeClerkRole } from "@/lib/auth/clerk-rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: mosque, error } = await supabase
      .from("mosques")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mosque });
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
    const { userId, orgRole } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = normalizeClerkRole(orgRole);
    const { data: profile } = await supabase
      .from("profiles")
      .select("mosque_id")
      .eq("id", userId)
      .single();

    const { data: linkedImams, error: linkedImamsError } = await supabase
      .from("imams")
      .select("id, mosque_id")
      .eq("profile_id", userId)
      .eq("is_active", true);

    if (linkedImamsError) {
      return NextResponse.json({ error: linkedImamsError.message }, { status: 500 });
    }

    const imamIds = (linkedImams ?? []).map((row) => String(row.id));
    let appointmentMosqueIds: string[] = [];

    if (imamIds.length > 0) {
      const { data: appointments, error: appointmentsError } = await supabase
        .from("imam_appointments")
        .select("mosque_id")
        .in("imam_id", imamIds)
        .eq("is_active", true);

      if (appointmentsError && appointmentsError.code !== "42P01") {
        return NextResponse.json({ error: appointmentsError.message }, { status: 500 });
      }

      appointmentMosqueIds = (appointments ?? [])
        .map((row) => (typeof row.mosque_id === "string" ? row.mosque_id : null))
        .filter((value): value is string => Boolean(value));
    }

    if (
      !canManageMosque({
        role,
        targetMosqueId: id,
        userMosqueId: profile?.mosque_id ?? null,
        userMosqueIds: [
          ...appointmentMosqueIds,
          ...(linkedImams ?? [])
            .map((row) => (typeof row.mosque_id === "string" ? row.mosque_id : null))
            .filter((value): value is string => Boolean(value)),
        ],
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = [
      "name",
      "address",
      "city",
      "state",
      "country",
      "zip_code",
      "latitude",
      "longitude",
      "phone",
      "email",
      "website",
      "description",
      "image_url",
      "facilities",
      "capacity",
      "established_year",
      "is_verified",
    ] as const;

    const updates = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key as (typeof allowedFields)[number]))
    );

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: mosque, error } = await supabase
      .from("mosques")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mosque });
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
    const { userId, orgRole } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = normalizeClerkRole(orgRole);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("mosques")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
