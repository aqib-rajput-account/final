"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BellRing,
  BookOpen,
  Building2,
  Calendar,
  Clock3,
  Database,
  DollarSign,
  Loader2,
  MessageSquare,
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
import type {
  AdminActivityEntry,
  AdminActivityResponse,
  AdminListResponse,
} from "@/lib/admin/types";
import { useAdminPanelMetadata } from "@/lib/hooks/use-admin-panel";

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

export default function ImamDashboardPage() {
  const { data, loading, refresh } = useAdminPanelMetadata();
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const [mosqueName, setMosqueName] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setActivity([]);
      setMosqueName(null);
      setLoadingActivity(loading);
      return;
    }

    let cancelled = false;

    async function loadScopedDashboard() {
      setLoadingActivity(true);
      try {
        const [mosqueResponse, activityResponse] = await Promise.all([
          fetch("/api/admin/entities/mosques?limit=1", { cache: "no-store" }),
          fetch("/api/admin/activity?limit=6", { cache: "no-store" }).catch(() => null),
        ]);

        const mosquePayload = (await mosqueResponse.json().catch(() => ({}))) as
          | AdminListResponse
          | { error?: string };
        const activityPayload =
          activityResponse != null
            ? ((await activityResponse.json().catch(() => ({}))) as
                | AdminActivityResponse
                | { error?: string })
            : null;

        if (!cancelled) {
          if (
            mosqueResponse.ok &&
            "items" in mosquePayload &&
            mosquePayload.items.length > 0
          ) {
            const firstMosque = mosquePayload.items[0] as Record<string, unknown>;
            setMosqueName(
              typeof firstMosque.name === "string" ? firstMosque.name : null
            );
          } else {
            setMosqueName(null);
          }

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
          setActivity([]);
          setMosqueName(null);
          setActivityUnavailable(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingActivity(false);
        }
      }
    }

    void loadScopedDashboard();

    return () => {
      cancelled = true;
    };
  }, [data, loading]);

  const totalRecords = (data?.entities ?? []).reduce(
    (sum, entity) => sum + (typeof entity.count === "number" ? entity.count : 0),
    0
  );
  const totalEntities = data?.entities.length ?? 0;
  const prayerTimeCount =
    data?.entities.find((entity) => entity.key === "prayer_times")?.count ?? 0;

  const quickLinks = [
    {
      href: "/imam/mosque",
      label: "Mosque Settings",
      description: "Update your mosque profile and operational details.",
      icon: Building2,
    },
    {
      href: "/imam/prayer-times",
      label: "Prayer Times",
      description: "Maintain adhan, iqama, and Jummah schedules.",
      icon: Clock3,
    },
    {
      href: "/imam/events",
      label: "Events",
      description: "Publish classes, khutbahs, and community events.",
      icon: Calendar,
    },
    {
      href: "/imam/announcements",
      label: "Announcements",
      description: "Share urgent notices and weekly community updates.",
      icon: BellRing,
    },
    {
      href: "/imam/imams",
      label: "Imam Team",
      description: "Manage leadership records and imam-facing profiles.",
      icon: Users,
    },
    {
      href: "/imam/community",
      label: "Community",
      description: "Moderate mosque posts and community messaging.",
      icon: MessageSquare,
    },
    {
      href: "/imam/finance",
      label: "Finance",
      description: "Review donations tied to your mosque.",
      icon: DollarSign,
    },
    {
      href: "/imam/control-center",
      label: "Control Center",
      description: "Open the full mosque-scoped CRUD surface.",
      icon: Database,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Imam Panel
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3.5 w-3.5" />
              Mosque Scoped
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {mosqueName ? `${mosqueName}` : "Imam Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Manage your mosque&apos;s live settings, prayer schedule, announcements,
            events, leadership records, community posts, and donations from one
            dedicated workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
          <Link href="/imam/control-center">
            <Button>
              <Database className="mr-2 h-4 w-4" />
              Open Control Center
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Managed Surfaces</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalEntities}</div>
            <p className="text-xs text-muted-foreground">
              Mosque-scoped entities available to this imam
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
              Total rows currently managed inside your mosque scope
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prayer Schedules</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : prayerTimeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Daily prayer-time rows configured for your mosque
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingActivity ? "..." : activity.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Latest mosque-scoped updates from your live panel
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Imam Workflows</CardTitle>
            <CardDescription>
              Every link below opens a mosque-scoped surface, so you only manage
              records connected to your own mosque.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {quickLinks.map((item) => (
              <Card key={item.href} className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={item.href}>
                    <Button variant="outline" size="sm">
                      Open {item.label}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Recent Mosque Activity</CardTitle>
              {activityUnavailable ? (
                <Badge variant="outline">Activity Feed Unavailable</Badge>
              ) : null}
            </div>
            <CardDescription>
              Latest updates broadcast from your mosque-scoped management feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading activity...
              </div>
            ) : activity.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No recent mosque activity found.
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
