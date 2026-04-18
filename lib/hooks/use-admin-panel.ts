"use client";

import { startTransition, useEffect, useState } from "react";
import { useRealtimeGateway } from "@/lib/hooks/use-realtime-gateway";
import type { AdminEntitiesResponse } from "@/lib/admin/types";

export function useAdminPanelMetadata(options?: {
  enabled?: boolean;
  enableRealtime?: boolean;
}) {
  const enabled = options?.enabled ?? true;
  const enableRealtime = options?.enableRealtime ?? true;
  const [data, setData] = useState<AdminEntitiesResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/entities", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as
          | AdminEntitiesResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            ("error" in payload ? payload.error : undefined) ||
              "Failed to load admin metadata"
          );
        }

        if (!cancelled) {
          setData(payload as AdminEntitiesResponse);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setData(null);
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load admin metadata"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTick]);

  useRealtimeGateway({
    enabled: enabled && enableRealtime && Boolean(data?.realtimeFeed),
    feedStreamId: data?.realtimeFeed,
    onEvent: () => {
      startTransition(() => {
        setRefreshTick((current) => current + 1);
      });
    },
  });

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshTick((current) => current + 1),
  };
}
