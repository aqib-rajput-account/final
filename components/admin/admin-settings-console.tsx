"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Globe,
  Loader2,
  Save,
  Settings2,
  Shield,
  Sparkles,
  ToggleLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPanelMetadata } from "@/lib/hooks/use-admin-panel";
import type {
  AdminActivityEntry,
  AdminActivityResponse,
  AdminEntityKey,
  AdminItemResponse,
  AdminSettingsRecord,
  ShuraPermissionMap,
} from "@/lib/admin/types";

type SettingsFormState = AdminSettingsRecord;

const generalFields = [
  { key: "site_name", label: "Site Name" },
  { key: "contact_email", label: "Contact Email" },
  { key: "support_phone", label: "Support Phone" },
] as const;

const notificationFieldLabels: Record<string, string> = {
  emailNotifications: "Email Notifications",
  pushNotifications: "Push Notifications",
  prayerReminders: "Prayer Reminders",
  eventReminders: "Event Reminders",
  weeklyDigest: "Weekly Digest",
};

const privacyFieldLabels: Record<string, string> = {
  publicProfiles: "Public Profiles",
  showMemberCount: "Show Member Count",
  allowAnonymousDonations: "Allow Anonymous Donations",
};

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

export function AdminSettingsConsole() {
  const { data: metadata, loading: metadataLoading, error, refresh } =
    useAdminPanelMetadata();
  const [settings, setSettings] = useState<SettingsFormState | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  const visibleEntities = useMemo(
    () => metadata?.entities.filter((entity) => entity.key !== "settings") ?? [],
    [metadata?.entities]
  );

  useEffect(() => {
    if (!metadata) {
      return;
    }

    let cancelled = false;

    async function loadSettings() {
      setLoadingSettings(true);
      try {
        const [settingsResponse, activityResponse] = await Promise.all([
          fetch("/api/admin/entities/settings/app", { cache: "no-store" }),
          fetch("/api/admin/activity?limit=8", { cache: "no-store" }),
        ]);

        const settingsPayload = (await settingsResponse
          .json()
          .catch(() => ({}))) as AdminItemResponse | { error?: string };
        const activityPayload = (await activityResponse
          .json()
          .catch(() => ({}))) as AdminActivityResponse | { error?: string };

        if (!settingsResponse.ok) {
          throw new Error(
            ("error" in settingsPayload ? settingsPayload.error : undefined) ||
              "Failed to load admin settings"
          );
        }

        if (!activityResponse.ok) {
          throw new Error(
            ("error" in activityPayload ? activityPayload.error : undefined) ||
              "Failed to load admin activity"
          );
        }

        if (!cancelled) {
          if (!("item" in settingsPayload)) {
            throw new Error("Admin settings response was malformed");
          }
          setActivity((activityPayload as AdminActivityResponse).items);
          setSettings(settingsPayload.item as unknown as SettingsFormState);
        }
      } catch (nextError) {
        if (!cancelled) {
          toast.error(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load admin settings"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSettings(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [metadata]);

  function updateRootField<Key extends keyof SettingsFormState>(
    key: Key,
    value: SettingsFormState[Key]
  ) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateObjectField(
    section: "notification_settings" | "privacy_settings" | "module_settings",
    key: string,
    value: boolean | string
  ) {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: {
          ...current[section],
          [key]: value,
        },
      };
    });
  }

  function updateShuraPermission(
    entityKey: AdminEntityKey,
    permission: keyof ShuraPermissionMap[AdminEntityKey],
    value: boolean
  ) {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        shura_permissions: {
          ...current.shura_permissions,
          [entityKey]: {
            ...current.shura_permissions[entityKey],
            [permission]: value,
          },
        },
      };
    });
  }

  async function handleSave() {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/entities/settings/app", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_name: settings.site_name,
          site_description: settings.site_description,
          contact_email: settings.contact_email,
          support_phone: settings.support_phone,
          default_timezone: settings.default_timezone,
          default_language: settings.default_language,
          date_format: settings.date_format,
          calculation_method: settings.calculation_method,
          notification_settings: settings.notification_settings,
          privacy_settings: settings.privacy_settings,
          module_settings: settings.module_settings,
          shura_permissions: settings.shura_permissions,
          metadata: settings.metadata,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | AdminItemResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          ("error" in payload ? payload.error : undefined) ||
            "Failed to save admin settings"
        );
      }

      if (!("item" in payload)) {
        throw new Error("Admin settings response was malformed");
      }

      setSettings(payload.item as unknown as SettingsFormState);
      toast.success("Admin settings updated");
      refresh();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Failed to save admin settings"
      );
    } finally {
      setSaving(false);
    }
  }

  const enabledModuleCount = Object.values(settings?.module_settings ?? {}).filter(Boolean)
    .length;
  const shuraReadCount = Object.values(settings?.shura_permissions ?? {}).filter(
    (permission) => permission.read
  ).length;

  if (metadataLoading || loadingSettings) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center rounded-xl border py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading admin settings...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {error || "Unable to load admin settings."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Live Configuration
            </Badge>
            {!metadata?.settingsWritable && (
              <Badge variant="destructive">Migration Required</Badge>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Application Settings
          </h1>
          <p className="text-muted-foreground">
            Control modules, notification defaults, privacy behavior, and Shura
            permissions from one live settings surface.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !metadata?.settingsWritable}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled Modules</CardTitle>
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledModuleCount}</div>
            <p className="text-xs text-muted-foreground">
              Active features exposed across the app
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shura Read Access</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shuraReadCount}</div>
            <p className="text-xs text-muted-foreground">
              Entity areas currently visible to Shura
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Default Locale</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.default_language}</div>
            <p className="text-xs text-muted-foreground">
              {settings.default_timezone}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">
              {new Date(settings.updated_at).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Settings changes propagate through realtime refreshes
            </p>
          </CardContent>
        </Card>
      </div>

      {!metadata?.settingsWritable && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Migration Required</CardTitle>
            <CardDescription>
              The `admin_settings` table is not available in the connected
              database yet. The console is showing defaults, but saves will stay
              disabled until the latest SQL migration is applied.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Branding, contact, locale, and runtime defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                {generalFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      value={(settings[field.key] as string | null) ?? ""}
                      onChange={(event) =>
                        updateRootField(field.key, event.target.value as never)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_description">Site Description</Label>
                <Textarea
                  id="site_description"
                  rows={3}
                  value={settings.site_description ?? ""}
                  onChange={(event) =>
                    updateRootField("site_description", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Default Timezone</Label>
                  <Input
                    value={settings.default_timezone}
                    onChange={(event) =>
                      updateRootField("default_timezone", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select
                    value={settings.default_language}
                    onValueChange={(value) =>
                      updateRootField("default_language", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="ur">Urdu</SelectItem>
                      <SelectItem value="bn">Bengali</SelectItem>
                      <SelectItem value="tr">Turkish</SelectItem>
                      <SelectItem value="ms">Malay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={settings.date_format}
                    onValueChange={(value) => updateRootField("date_format", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prayer Calculation</Label>
                  <Select
                    value={settings.calculation_method}
                    onValueChange={(value) =>
                      updateRootField("calculation_method", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="isna">ISNA</SelectItem>
                      <SelectItem value="mwl">Muslim World League</SelectItem>
                      <SelectItem value="egypt">Egyptian General Authority</SelectItem>
                      <SelectItem value="makkah">Umm Al-Qura</SelectItem>
                      <SelectItem value="karachi">University of Karachi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Global defaults applied to the experience across the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(settings.notification_settings).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {notificationFieldLabels[key] ?? formatEntityLabel(key)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Control this behavior by default for the app.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked) =>
                      updateObjectField("notification_settings", key, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Defaults</CardTitle>
              <CardDescription>
                Platform-wide privacy behaviors and retention defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(settings.privacy_settings)
                .filter(([key]) => key !== "dataRetention")
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {privacyFieldLabels[key] ?? formatEntityLabel(key)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Default behavior for the broader platform.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(value)}
                      onCheckedChange={(checked) =>
                        updateObjectField("privacy_settings", key, checked)
                      }
                    />
                  </div>
                ))}
              <div className="space-y-2 rounded-xl border px-4 py-3">
                <Label htmlFor="dataRetention">Data Retention (days)</Label>
                <Select
                  value={String(settings.privacy_settings.dataRetention ?? "365")}
                  onValueChange={(value) =>
                    updateObjectField("privacy_settings", "dataRetention", value)
                  }
                >
                  <SelectTrigger id="dataRetention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="730">2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Module Controls</CardTitle>
              <CardDescription>
                Turn product areas on or off without a redeploy.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(settings.module_settings).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{formatEntityLabel(key)}</p>
                    <p className="text-sm text-muted-foreground">
                      Toggle module availability from the admin panel.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked) =>
                      updateObjectField("module_settings", key, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shura Permissions</CardTitle>
              <CardDescription>
                Define exactly which admin-managed entities Shura can read or act on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleEntities.map((entity) => {
                const permission =
                  settings.shura_permissions[entity.key] ??
                  settings.shura_permissions.mosques;

                return (
                  <div key={entity.key} className="rounded-xl border p-4">
                    <div className="mb-3">
                      <p className="font-medium">{entity.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entity.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["read", "create", "update", "delete"] as const).map(
                        (permissionKey) => (
                          <div
                            key={permissionKey}
                            className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                          >
                            <span className="text-sm font-medium capitalize">
                              {permissionKey}
                            </span>
                            <Switch
                              checked={permission[permissionKey]}
                              onCheckedChange={(checked) =>
                                updateShuraPermission(
                                  entity.key,
                                  permissionKey,
                                  checked
                                )
                              }
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Activity</CardTitle>
              <CardDescription>
                Latest control-plane actions captured through the realtime event bus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No recent admin activity found.
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
    </div>
  );
}
