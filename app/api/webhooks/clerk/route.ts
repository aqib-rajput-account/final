import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }

  const eventType = evt.type;

  try {
    const supabase = createSupabaseAdmin();

    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url, username, phone_numbers } = evt.data;
      
      const primaryEmail = email_addresses?.[0]?.email_address || null;
      const primaryPhone = phone_numbers?.[0]?.phone_number || null;
      const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

      // For new users, set default role to "member"
      const profileData = {
        id,
        email: primaryEmail,
        full_name: fullName,
        username: username || null,
        avatar_url: image_url || null,
        phone: primaryPhone,
        role: "member", // Default role for new users
        is_active: true,
        is_verified: false,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .insert(profileData);

      if (error) {
        // If insert fails (e.g., user already exists), try upsert without role
        if (error.code === "23505") {
          const { error: upsertError } = await supabase
            .from("profiles")
            .update({
              email: primaryEmail,
              full_name: fullName,
              username: username || null,
              avatar_url: image_url || null,
              phone: primaryPhone,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);

          if (upsertError) {
            console.error("Error updating existing profile:", upsertError);
            return new Response("Error syncing user to database", { status: 500 });
          }
        } else {
          console.error("Error creating profile:", error);
          return new Response("Error syncing user to database", { status: 500 });
        }
      }

      console.log(`User created with default role 'member': ${id}`);
    }

    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url, username, phone_numbers } = evt.data;
      
      const primaryEmail = email_addresses?.[0]?.email_address || null;
      const primaryPhone = phone_numbers?.[0]?.phone_number || null;
      const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

      // For updates, don't change the role - only update profile info
      const profileData = {
        email: primaryEmail,
        full_name: fullName,
        username: username || null,
        avatar_url: image_url || null,
        phone: primaryPhone,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", id);

      if (error) {
        console.error("Error updating profile:", error);
        return new Response("Error syncing user to database", { status: 500 });
      }

      console.log(`User updated: ${id}`);
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;

      if (id) {
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Error deleting profile:", error);
          return new Response("Error deleting user from database", { status: 500 });
        }

        console.log(`User deleted: ${id}`);
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}
