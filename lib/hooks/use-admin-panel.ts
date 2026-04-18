"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeEventEnvelope } from "@/backend/realtime/types";
import type { AdminEntitiesResponse } from "@/lib/admin/types";
import { RealtimeGatewayClient } from "@/lib/realtime/subscription";

type AdminPanelMetadataSnapshot = {
  data: AdminEntitiesResponse | null;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number;
};

const ADMIN_METADATA_CACHE_TTL_MS = 15_000;
const REALTIME_REFRESH_DEBOUNCE_MS = 180;

const INITIAL_SNAPSHOT: AdminPanelMetadataSnapshot = {
  data: null,
  loading: false,
  error: null,
  lastLoadedAt: 0,
};

let snapshot = INITIAL_SNAPSHOT;
let loadPromise: Promise<void> | null = null;
let realtimeClient: RealtimeGatewayClient | null = null;
let realtimeConnectPromise: Promise<void> | null = null;
let realtimeFeedStreamId: string | null = null;
let realtimeConsumerCount = 0;
let scheduledRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function emitSnapshot() {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(nextSnapshot: Partial<AdminPanelMetadataSnapshot>) {
  snapshot = {
    ...snapshot,
    ...nextSnapshot,
  };
  emitSnapshot();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function hasFreshSnapshot() {
  return (
    Boolean(snapshot.data) &&
    Date.now() - snapshot.lastLoadedAt < ADMIN_METADATA_CACHE_TTL_MS
  );
}

function applyRealtimeCountPatch(event: RealtimeEventEnvelope) {
  if (!snapshot.data) {
    return;
  }

  const entityIndex = snapshot.data.entities.findIndex(
    (entity) => entity.key === event.entityType
  );

  if (entityIndex === -1) {
    return;
  }

  const entity = snapshot.data.entities[entityIndex];
  if (typeof entity.count !== "number") {
    return;
  }

  const action = event.eventType.split(".").at(-1);
  if (action !== "created" && action !== "deleted") {
    return;
  }

  const nextCount =
    action === "created" ? entity.count + 1 : Math.max(0, entity.count - 1);
  const nextEntities = snapshot.data.entities.slice();
  nextEntities[entityIndex] = {
    ...entity,
    count: nextCount,
  };

  snapshot = {
    ...snapshot,
    data: {
      ...snapshot.data,
      entities: nextEntities,
    },
  };
  emitSnapshot();
}

function scheduleMetadataRefresh() {
  if (scheduledRefreshTimer !== null) {
    return;
  }

  scheduledRefreshTimer = setTimeout(() => {
    scheduledRefreshTimer = null;
    void loadAdminPanelMetadata({ force: true, background: true });
  }, REALTIME_REFRESH_DEBOUNCE_MS);
}

async function disconnectRealtimeSubscription() {
  if (scheduledRefreshTimer !== null) {
    clearTimeout(scheduledRefreshTimer);
    scheduledRefreshTimer = null;
  }

  if (!realtimeClient) {
    realtimeFeedStreamId = null;
    return;
  }

  const activeClient = realtimeClient;
  realtimeClient = null;
  realtimeFeedStreamId = null;

  await activeClient.disconnect().catch(() => undefined);
}

async function ensureRealtimeSubscription() {
  const feedStreamId = snapshot.data?.realtimeFeed;

  if (!feedStreamId || realtimeConsumerCount === 0) {
    await disconnectRealtimeSubscription();
    return;
  }

  if (realtimeClient && realtimeFeedStreamId === feedStreamId) {
    return;
  }

  if (realtimeConnectPromise) {
    return realtimeConnectPromise;
  }

  realtimeConnectPromise = (async () => {
    await disconnectRealtimeSubscription();

    const client = new RealtimeGatewayClient({
      feedStreamId,
      onEvent: (event) => {
        applyRealtimeCountPatch(event);
        scheduleMetadataRefresh();
      },
      onError: () => {
        scheduleMetadataRefresh();
      },
    });

    realtimeClient = client;
    realtimeFeedStreamId = feedStreamId;

    try {
      await client.connect();
    } catch (error) {
      if (realtimeClient === client) {
        realtimeClient = null;
        realtimeFeedStreamId = null;
      }

      await client.disconnect().catch(() => undefined);
      throw error;
    } finally {
      realtimeConnectPromise = null;
    }
  })();

  return realtimeConnectPromise;
}

async function loadAdminPanelMetadata(options?: {
  force?: boolean;
  background?: boolean;
}) {
  const force = options?.force ?? false;
  const background = options?.background ?? false;

  if (!force && hasFreshSnapshot()) {
    void ensureRealtimeSubscription();
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  const hadData = snapshot.data !== null;

  if (!background) {
    setSnapshot({
      loading: !hadData,
      error: hadData ? null : snapshot.error,
    });
  }

  loadPromise = (async () => {
    try {
      const response = await fetch("/api/admin/entities", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as
        | AdminEntitiesResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          ("error" in payload ? payload.error : undefined) ||
            "Failed to load admin metadata"
        );
      }

      setSnapshot({
        data: payload as AdminEntitiesResponse,
        error: null,
        loading: false,
        lastLoadedAt: Date.now(),
      });

      void ensureRealtimeSubscription();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load admin metadata";

      setSnapshot({
        data: snapshot.data,
        error: snapshot.data ? null : message,
        loading: false,
      });
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

function registerRealtimeConsumer() {
  realtimeConsumerCount += 1;
  void ensureRealtimeSubscription();

  return () => {
    realtimeConsumerCount = Math.max(0, realtimeConsumerCount - 1);
    if (realtimeConsumerCount === 0) {
      void disconnectRealtimeSubscription();
    }
  };
}

export function useAdminPanelMetadata(options?: {
  enabled?: boolean;
  enableRealtime?: boolean;
}) {
  const enabled = options?.enabled ?? true;
  const enableRealtime = options?.enableRealtime ?? true;
  const storeSnapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void loadAdminPanelMetadata();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !enableRealtime) {
      return;
    }

    return registerRealtimeConsumer();
  }, [enabled, enableRealtime]);

  return {
    data: enabled ? storeSnapshot.data : null,
    loading: enabled ? storeSnapshot.loading : false,
    error: enabled ? storeSnapshot.error : null,
    refresh: () => {
      if (!enabled) {
        return;
      }

      void loadAdminPanelMetadata({ force: true });
    },
  };
}
