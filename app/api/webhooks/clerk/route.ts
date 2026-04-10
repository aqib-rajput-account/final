import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { provisionMemberAccount } from "@/backend/auth/provisioning";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return new Response("Error verifying webhook", { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      await provisionMemberAccount({ userId: evt.data.id });
    }

    if (evt.type === "user.deleted" && evt.data.id) {
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.from("profiles").delete().eq("id", evt.data.id);

      if (error) {
        console.error("Error deleting profile:", error);
        return new Response("Error deleting user from database", { status: 500 });
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}
