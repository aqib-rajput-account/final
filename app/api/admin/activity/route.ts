import { NextResponse } from "next/server";
import {
  canAccessAdminSurface,
  resolveAdminSession,
} from "@/backend/admin/auth";
import { listAdminActivity } from "@/backend/admin/activity";

export async function GET(request: Request) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 12);
    const entityType = url.searchParams.get("entityType") ?? undefined;

    const items = await listAdminActivity({
      session,
      limit,
      entityType,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load admin activity",
      },
      { status: 500 }
    );
  }
}
