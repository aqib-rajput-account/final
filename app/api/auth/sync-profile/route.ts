import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ProvisioningError, provisionMemberAccount } from "@/backend/auth/provisioning";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await provisionMemberAccount({ userId });
    return NextResponse.json({ success: true, ...result });
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

    console.error("Unexpected sync-profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
