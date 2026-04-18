import { auth, verifyToken } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ProvisioningError, provisionMemberAccount } from "@/backend/auth/provisioning";
import { normalizeClerkRole } from "@/lib/auth/clerk-rbac";

export async function POST(request: NextRequest) {
  try {
    let rawUserId: string | null = null;
    let organizationRole: string | null = null;
    const { orgRole } = await auth();
    organizationRole = orgRole || null;
    const tokenHeader = request.headers.get("x-onboarding-token");

    if (tokenHeader) {
      try {
        const decoded = await verifyToken(tokenHeader, { secretKey: process.env.CLERK_SECRET_KEY });
        rawUserId = decoded.sub;
      } catch (err) {
        console.warn("Invalid x-onboarding-token", err);
      }
    }

    if (!rawUserId) {
      const { userId } = await auth();
      rawUserId = userId;
    }

    if (!rawUserId) {
      return NextResponse.json({ error: "Unauthorized (Session could not be verified)" }, { status: 401 });
    }

    const userId = rawUserId;

    const body = await request.json().catch(() => ({})) as {
      fullName?: string | null;
      username?: string | null;
      mosqueId?: string | null;
      role?: string | null;
    };

    // Calculate role: Prioritize body.role if exists, but fallback to Clerk role normalization.
    const resolvedAuthRole = normalizeClerkRole(organizationRole);

    const result = await provisionMemberAccount({
      userId,
      fullName: body.fullName ?? null,
      username: body.username ?? null,
      mosqueId: body.mosqueId ?? null,
      role: resolvedAuthRole !== "member" ? resolvedAuthRole : (body.role ?? "member"),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProvisioningError) {
      return NextResponse.json(
        {
          error: error.message,
          suggestedUsername: error.suggestedUsername,
        },
        { status: error.status }
      );
    }

    console.error("Unexpected onboarding provisioning error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
