"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Database,
  Loader2,
  Shield,
  SlidersHorizontal,
  Zap,
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
import type { AdminEntitiesResponse, AdminEntityKey } from "@/lib/admin/types";
import { useRealtimeGateway } from "@/lib/hooks/use-realtime-gateway";

function getEntityHref(entityKey: AdminEntityKey): string {
  switch (entityKey) {
    case "settings":
      return "/admin/settings";
    case "profiles":
    case "posts":
      return "/admin/community";
    case "donations":
      return "/admin/finance";
    default:
      return `/admin/${entityKey}`;
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminEntitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/entities", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as
          | AdminEntitiesResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            ("error" in payload ? payload.error : undefined) ||
              "Failed to load dashboard"
          );
        }

        if (!cancelled) {
          setData(payload as AdminEntitiesResponse);
        }
      } catch {
        if (!cancelled) {
          setData(null);
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
      startTransition(() => {
        setRefreshTick((current) => current + 1);
      });
    },
  });

  const entityCount = data?.entities.length ?? 0;
  const totalRecords = (data?.entities ?? []).reduce(
    (sum, entity) => sum + (typeof entity.count === "number" ? entity.count : 0),
    0
  );
  const enabledModules = Object.values(data?.moduleSettings ?? {}).filter(Boolean).length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3.5 w-3.5" />
              Realtime Admin
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              Role Enforced
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            The Admin Panel now runs on a shared entity registry, generic CRUD
            endpoints, and live update broadcasts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/control-center">
            <Button>
              <Database className="mr-2 h-4 w-4" />
              Open Control Center
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Global Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Managed Entities</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : entityCount}</div>
            <p className="text-xs text-muted-foreground">
              Registry-backed modules the current role can manage
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
              Current rows across the visible admin entities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled Modules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : enabledModules}</div>
            <p className="text-xs text-muted-foreground">
              Controlled from the global settings singleton
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <p className="text-xs text-muted-foreground">
              Admin writes broadcast through the realtime service
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Entity Overview</CardTitle>
            <CardDescription>
              Each card reflects the current role&apos;s capability surface from the
              new admin registry.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setRefreshTick((current) => current + 1)}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading dashboard...
            </div>
          ) : !data || data.entities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No admin entities are currently available for your role.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.entities.map((entity) => (
                <Card key={entity.key} className="border-dashed">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{entity.label}</CardTitle>
                      <Badge variant="secondary">
                        {typeof entity.count === "number" ? entity.count : "-"}
                      </Badge>
                    </div>
                    <CardDescription>{entity.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={entity.capability.read ? "secondary" : "outline"}>
                        Read
                      </Badge>
                      <Badge
                        variant={entity.capability.create ? "secondary" : "outline"}
                      >
                        Create
                      </Badge>
                      <Badge
                        variant={entity.capability.update ? "secondary" : "outline"}
                      >
                        Update
                      </Badge>
                      <Badge
                        variant={entity.capability.delete ? "secondary" : "outline"}
                      >
                        Delete
                      </Badge>
                    </div>
                    <Link href={getEntityHref(entity.key)}>
                      <Button variant="ghost" size="sm" className="px-0">
                        Open {entity.label}
                        <ArrowUpRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
