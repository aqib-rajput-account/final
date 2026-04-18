import { NextResponse } from "next/server";
import {
  canAccessAdminSurface,
  resolveAdminSession,
} from "@/backend/admin/auth";
import {
  createAdminEntityRecord,
  listAdminEntityRecords,
  toAdminErrorResponse,
} from "@/backend/admin/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ entity: string }> }
) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { entity } = await context.params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 25);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const search = url.searchParams.get("search");

    const response = await listAdminEntityRecords({
      session,
      entityKey: entity,
      limit,
      offset,
      search,
    });

    return NextResponse.json(response);
  } catch (error) {
    const normalized = toAdminErrorResponse(error);
    return NextResponse.json(
      { error: normalized.message },
      { status: normalized.status }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ entity: string }> }
) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { entity } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const response = await createAdminEntityRecord({
      request,
      session,
      entityKey: entity,
      payload,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const normalized = toAdminErrorResponse(error);
    return NextResponse.json(
      { error: normalized.message },
      { status: normalized.status }
    );
  }
}

