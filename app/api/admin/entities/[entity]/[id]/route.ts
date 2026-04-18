import { NextResponse } from "next/server";
import {
  canAccessAdminSurface,
  resolveAdminSession,
} from "@/backend/admin/auth";
import {
  deleteAdminEntityRecord,
  getAdminEntityRecord,
  toAdminErrorResponse,
  updateAdminEntityRecord,
} from "@/backend/admin/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { entity, id } = await context.params;
    const response = await getAdminEntityRecord({
      session,
      entityKey: entity,
      id,
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { entity, id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const response = await updateAdminEntityRecord({
      request,
      session,
      entityKey: entity,
      id,
      payload,
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const session = await resolveAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessAdminSurface(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { entity, id } = await context.params;
    await deleteAdminEntityRecord({
      request,
      session,
      entityKey: entity,
      id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = toAdminErrorResponse(error);
    return NextResponse.json(
      { error: normalized.message },
      { status: normalized.status }
    );
  }
}

