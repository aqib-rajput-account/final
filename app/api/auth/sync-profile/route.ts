import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);

    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;
    const primaryPhone =
      clerkUser.phoneNumbers.find((phone) => phone.id === clerkUser.primaryPhoneNumberId)
        ?.phoneNumber ?? clerkUser.phoneNumbers[0]?.phoneNumber ?? null;
    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

    const supabase = createSupabaseAdmin();

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: primaryEmail,
        full_name: fullName,
        username: clerkUser.username ?? null,
        avatar_url: clerkUser.imageUrl ?? null,
        phone: primaryPhone,
        role: "member",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      console.error("Error syncing Clerk user to Supabase profile:", error);
      return NextResponse.json({ error: "Failed to sync profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected sync-profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
