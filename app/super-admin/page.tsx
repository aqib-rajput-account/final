"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Crown,
  Database,
  Loader2,
  Settings2,
  Shield,
  UserCog,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminActivityEntry, AdminActivityResponse, AdminEntitiesResponse } from "@/lib/admin/types";
import { useRealtimeGateway } from "@/lib/hooks/use-realtime-gateway";

function formatEntityLabel(entityKey: string): string {
  return entityKey
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatActivityLabel(item: AdminActivityEntry): string {
  const verb = item.eventType.split(".").at(-1) ?? "updated";
  return `${item.actorName ?? item.actorUserId} ${verb} ${formatEntityLabel(
    item.entityType
  )}`;
}

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<AdminEntitiesResponse | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const [realtimeIssue, setRealtimeIssue] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [entitiesResponse, activityResponse] = await Promise.all([
          fetch("/api/admin/entities", { cache: "no-store" }),
          fetch("/api/admin/activity?limit=6", { cache: "no-store" }).catch(() => null),
        ]);

        const entitiesPayload = (await entitiesResponse.json().catch(() => ({}))) as
          | AdminEntitiesResponse
          | { error?: string };
        const activityPayload =
          activityResponse != null
            ? ((await activityResponse.json().catch(() => ({}))) as
                | AdminActivityResponse
                | { error?: string })
            : null;

        if (!entitiesResponse.ok) {
          throw new Error(
            ("error" in entitiesPayload ? entitiesPayload.error : undefined) ||
              "Failed to load super admin dashboard"
          );
        }

        if (!cancelled) {
          setData(entitiesPayload as AdminEntitiesResponse);
          setRealtimeIssue((current) =>
            current?.includes("Failed to catch up") ? null : current
          );
          if (
            activityResponse?.ok &&
            activityPayload != null &&
            "items" in activityPayload
          ) {
            setActivity(activityPayload.items);
            setActivityUnavailable(false);
          } else {
            setActivity([]);
            setActivityUnavailable(true);
          }
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setActivity([]);
          setActivityUnavailable(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useRealtimeGateway({
    enabled: Boolean(data?.realtimeFeed),
    feedStreamId: data?.realtimeFeed,
    onEvent: () => {
      setRealtimeIssue(null);
      startTransition(() => {
        setRefreshTick((current) => current + 1);
      });
    },
    onError: (error) => {
      setRealtimeIssue(error.message);
    },
  });

  const totalRecords = (data?.entities ?? []).reduce(
    (sum, entity) => sum + (typeof entity.count === "number" ? entity.count : 0),
    0
  );
  const enabledModules = Object.values(data?.moduleSettings ?? {}).filter(Boolean).length;
  const profileCount =
    data?.entities.find((entity) => entity.key === "profiles")?.count ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Crown className="h-3.5 w-3.5" />
              Super Admin
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              Platform Governance
            </Badge>
            {realtimeIssue ? <Badge variant="outline">Manual Refresh Fallback</Badge> : null}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Super Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Govern the platform layer separately from day-to-day admin operations,
            with direct access to global control, user governance, and cross-module
            visibility.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/super-admin/control-center">
            <Button>
              <Database className="mr-2 h-4 w-4" />
              Open Super Control Center
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline">
              <ArrowRight className="mr-2 h-4 w-4" />
              Open Admin Panel
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Governed Surfaces</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : data?.entities.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Admin-managed entities visible from the registry
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : profileCount}</div>
            <p className="text-xs text-muted-foreground">
              Profiles currently available to governance workflows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              Total rows across visible admin entities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled Modules</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : enabledModules}</div>
            <p className="text-xs text-muted-foreground">
              Runtime modules currently enabled from global settings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Governance Workflows</CardTitle>
            <CardDescription>
              Use the Super Admin panel for platform-level actions, and keep the
              operational Admin panel focused on daily management.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Global Control Center</CardTitle>
                <CardDescription>
                  Access every registered entity from one surface with realtime sync.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/super-admin/control-center">
                  <Button variant="outline" size="sm">
                    Open Control Center
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">User Governance</CardTitle>
                <CardDescription>
                  Manage role hierarchy, account state, and profile governance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/super-admin/users">
                  <Button variant="outline" size="sm">
                    Open User Governance
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Global Settings</CardTitle>
                <CardDescription>
                  Control runtime modules, permissions, and defaults for the whole app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/super-admin/settings">
                  <Button variant="outline" size="sm">
                    Open Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Operational Admin Panel</CardTitle>
                <CardDescription>
                  Jump into the day-to-day admin surface without losing separation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Open Admin Panel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Recent Platform Activity</CardTitle>
              {activityUnavailable ? (
                <Badge variant="outline">Activity Feed Unavailable</Badge>
              ) : null}
            </div>
            <CardDescription>
              Latest admin-side mutations captured through the shared realtime bus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading activity...
              </div>
            ) : activity.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No recent platform activity found.
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.eventId} className="rounded-xl border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{formatActivityLabel(item)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatEntityLabel(item.entityType)} ID: {item.entityId}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(item.occurredAt).toLocaleTimeString()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
