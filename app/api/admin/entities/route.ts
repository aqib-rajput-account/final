import { NextResponse } from "next/server";
import {
  canAccessAdminSurface,
  resolveAdminSession,
} from "@/backend/admin/auth";
import {
  listAdminEntities,
  toAdminErrorResponse,
} from "@/backend/admin/service";

export async function GET(request: Request) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await listAdminEntities(session);
    return NextResponse.json(response);
  } catch (error) {
    const normalized = toAdminErrorResponse(error);
    return NextResponse.json(
      { error: normalized.message },
      { status: normalized.status }
    );
  }
}

