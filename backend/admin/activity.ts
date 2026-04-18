import { createClient } from "@/lib/supabase/server";
import type { AdminActivityEntry } from "@/lib/admin/types";
import type { AdminSession } from "./auth";
import { resolveManagementRealtimeFeed } from "./defaults";

function isMissingRelationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function isMissingRealtimeChannelsColumnError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  return (
    message.toLowerCase().includes("could not find the 'channels' column") ||
    message.toLowerCase().includes('column "channels"')
  );
}

export async function listAdminActivity(input?: {
  session?: AdminSession;
  limit?: number;
  entityType?: string;
}): Promise<AdminActivityEntry[]> {
  if (input?.session?.role === "imam" && !input.session.mosqueId) {
    return [];
  }

  const supabase = await createClient();
  const limit = Math.max(1, Math.min(input?.limit ?? 12, 50));
  const feedStreamId = input?.session
    ? resolveManagementRealtimeFeed(input.session)
    : null;

  let query = supabase
    .from("realtime_events")
    .select(
      "event_id, event_type, entity_type, entity_id, actor_user_id, occurred_at, payload, channels"
    )
    .order("event_id", { ascending: false })
    .limit(feedStreamId ? Math.max(limit * 5, 50) : limit);

  if (feedStreamId) {
    query = query.contains("channels", [`feed:${feedStreamId}`]);
  }

  if (input?.entityType) {
    query = query.eq("entity_type", input.entityType);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error) || isMissingRealtimeChannelsColumnError(error)) {
      return [];
    }

    throw error;
  }

  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((row) => row.actor_user_id).filter(Boolean))];

  const profileQueryResult = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
    : {
        data: [] as Array<{
          id: string;
          full_name: string | null;
          email: string | null;
        }>,
        error: null,
      };

  const profiles = profileQueryResult.error ? [] : profileQueryResult.data;

  const actorMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id,
    ])
  );

  return rows.slice(0, limit).map((row) => ({
    eventId: row.event_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorUserId: row.actor_user_id,
    actorName: actorMap.get(row.actor_user_id) ?? null,
    occurredAt: row.occurred_at,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}
