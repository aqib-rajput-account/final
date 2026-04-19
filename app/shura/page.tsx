"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Clock3,
  Database,
  ListTodo,
  Loader2,
  Shield,
  UserPlus,
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
import type { AdminActivityEntry, AdminActivityResponse } from "@/lib/admin/types";
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

export default function ShuraDashboardPage() {
  const { data, loading, refresh } = useAdminPanelMetadata();
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityUnavailable, setActivityUnavailable] = useState(false);

  const entityCount = useMemo(
    () => Object.fromEntries((data?.entities ?? []).map((entity) => [entity.key, entity.count ?? 0])),
    [data?.entities]
  ) as Record<string, number>;

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      setLoadingActivity(true);
      try {
        const response = await fetch("/api/admin/activity?limit=8", {
          cache: "no-store",
        }).catch(() => null);

        const payload =
          response != null
            ? ((await response.json().catch(() => ({}))) as
                | AdminActivityResponse
                | { error?: string })
            : null;

        if (!cancelled) {
          if (response?.ok && payload && "items" in payload) {
            setActivity(payload.items);
            setActivityUnavailable(false);
          } else {
            setActivity([]);
            setActivityUnavailable(true);
          }
        }
      } catch {
        if (!cancelled) {
          setActivity([]);
          setActivityUnavailable(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingActivity(false);
        }
      }
    }

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [data]);

  const quickLinks = [
    {
      href: "/shura/mosques",
      label: "Mosque Network",
      description: "Review every mosque in the application and keep network operations aligned.",
      icon: Building2,
    },
    {
      href: "/shura/teams",
      label: "Operations Teams",
      description: "Create field teams, attach members, and decide which mosque they support.",
      icon: BriefcaseBusiness,
    },
    {
      href: "/shura/tasks",
      label: "Task Dispatch",
      description: "Assign action items to teams and track progress across all mosques.",
      icon: ListTodo,
    },
    {
      href: "/shura/imams",
      label: "Imam Appointments",
      description: "Oversee imam assignments, active leadership, and appointment coverage.",
      icon: UserPlus,
    },
    {
      href: "/shura/prayer-times",
      label: "Prayer Times",
      description: "Ensure schedules stay accurate across the whole mosque network.",
      icon: Clock3,
    },
    {
      href: "/shura/events",
      label: "Events",
      description: "Coordinate the shared programming calendar and operational visibility.",
      icon: Calendar,
    },
    {
      href: "/shura/announcements",
      label: "Announcements",
      description: "Push important notices and follow-up communications across mosques.",
      icon: BellRing,
    },
    {
      href: "/shura/control-center",
      label: "Control Center",
      description: "Open the full Shura command surface with live entity management.",
      icon: Database,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              Shura Panel
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3.5 w-3.5" />
              All Mosques
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Shura Operations Dashboard
          </h1>
          <p className="text-muted-foreground">
            Oversee every mosque in the application, dispatch teams, assign tasks,
            monitor imam appointments, and keep network-wide operations moving from one live workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
          <Link href="/shura/control-center">
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
            <CardTitle className="text-sm font-medium">Mosques</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : entityCount.mosques ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total mosque records under Shura oversight
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operations Teams</CardTitle>
            <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : entityCount.management_teams ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Teams currently supporting network operations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : entityCount.mosque_tasks ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Cross-mosque work items tracked by Shura
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Imam Appointments</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : entityCount.imams ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Leadership records visible across the network
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Shura Workflows</CardTitle>
            <CardDescription>
              Use these live surfaces to manage mosques, coordinate teams, assign work,
              and verify progress across the full network.
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
              <CardTitle>Recent Network Activity</CardTitle>
              {activityUnavailable ? (
                <Badge variant="outline">Activity Feed Unavailable</Badge>
              ) : null}
            </div>
            <CardDescription>
              Latest live actions across mosque operations, teams, and assignments.
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
                No recent Shura activity found.
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
