import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ProvisioningError, provisionMemberAccount } from "@/backend/auth/provisioning";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      fullName?: string | null;
      username?: string | null;
      mosqueId?: string | null;
      role?: string | null;
    };

    const result = await provisionMemberAccount({
      userId,
      fullName: body.fullName ?? null,
      username: body.username ?? null,
      mosqueId: body.mosqueId ?? null,
      role: body.role ?? null,
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
