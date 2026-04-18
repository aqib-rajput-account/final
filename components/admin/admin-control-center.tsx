"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Activity,
  Database,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AdminActivityEntry,
  AdminActivityResponse,
  AdminEntityKey,
  AdminFieldConfig,
  AdminItemResponse,
  AdminListResponse,
  AdminLookupOption,
} from "@/lib/admin/types";
import { useAdminPanelMetadata } from "@/lib/hooks/use-admin-panel";
import { useRealtimeGateway } from "@/lib/hooks/use-realtime-gateway";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ControlCenterEntity = {
  key: AdminEntityKey;
  label: string;
  singularLabel: string;
  description: string;
  primaryKey: string;
  listFields: string[];
  formFields: AdminFieldConfig[];
  searchPlaceholder?: string;
  singleton?: boolean;
  singletonId?: string;
  capability: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  count: number | null;
};

interface AdminControlCenterProps {
  title?: string;
  description?: string;
  allowedEntityKeys?: AdminEntityKey[];
  initialEntityKey?: AdminEntityKey;
}

const EMPTY_SELECT_VALUE = "__empty__";
const ALL_FILTER_VALUE = "__all__";

function formatDateForInput(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatEntityLabel(entityKey: string): string {
  return entityKey
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatActivityLabel(item: AdminActivityEntry): string {
  const verb = item.eventType.split(".").at(-1) ?? "updated";
  return `${item.actorName ?? item.actorUserId} ${verb} ${formatEntityLabel(
    item.entityType
  )}`;
}

function buildFormValues(
  entity: ControlCenterEntity,
  item?: Record<string, unknown> | null
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of entity.formFields) {
    const rawValue = item?.[field.key];

    if (field.type === "boolean") {
      result[field.key] = Boolean(rawValue);
      continue;
    }

    if (field.type === "json") {
      result[field.key] = rawValue
        ? JSON.stringify(rawValue, null, 2)
        : JSON.stringify({}, null, 2);
      continue;
    }

    if (field.type === "tags") {
      result[field.key] = Array.isArray(rawValue)
        ? rawValue.join(", ")
        : rawValue
          ? String(rawValue)
          : "";
      continue;
    }

    if (field.type === "datetime") {
      result[field.key] = formatDateForInput(rawValue);
      continue;
    }

    result[field.key] = rawValue == null ? "" : String(rawValue);
  }

  return result;
}

function formatCellValue(
  field: AdminFieldConfig | undefined,
  value: unknown,
  lookups: Record<string, AdminLookupOption[]>
): string {
  if (value == null || value === "") {
    return "-";
  }

  if (field?.lookup) {
    const option = lookups[field.lookup]?.find(
      (entry) => entry.value === String(value)
    );
    return option?.label ?? String(value);
  }

  if (field?.type === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (field?.type === "json") {
    const serialized = JSON.stringify(value);
    return serialized.length > 60
      ? `${serialized.slice(0, 57)}...`
      : serialized;
  }

  if (field?.type === "tags" && Array.isArray(value)) {
    return value.join(", ");
  }

  if (field?.type === "datetime" || field?.type === "date") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return field.type === "date"
        ? date.toLocaleDateString()
        : date.toLocaleString();
    }
  }

  const nextValue = String(value);
  return nextValue.length > 80 ? `${nextValue.slice(0, 77)}...` : nextValue;
}

function getFieldOptions(
  field: AdminFieldConfig,
  lookups: Record<string, AdminLookupOption[]>
): AdminLookupOption[] {
  if (field.options?.length) {
    return field.options;
  }

  if (field.lookup) {
    return lookups[field.lookup] ?? [];
  }

  return [];
}
export function AdminControlCenter({
  title = "Control Center",
  description = "Manage live application entities, settings, and permissions from one reusable admin surface.",
  allowedEntityKeys,
  initialEntityKey,
}: AdminControlCenterProps) {
  const {
    data: metadata,
    loading: loadingMetadata,
    error: metadataError,
    refresh: refreshMetadata,
  } = useAdminPanelMetadata();
  const [selectedEntityKey, setSelectedEntityKey] = useState<AdminEntityKey | null>(
    initialEntityKey ?? null
  );
  const [entityData, setEntityData] = useState<AdminListResponse | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [realtimeIssue, setRealtimeIssue] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [refreshTick, setRefreshTick] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const availableEntities = useMemo(
    () =>
      (metadata?.entities ?? []).filter(
        (entity) => !allowedEntityKeys || allowedEntityKeys.includes(entity.key)
      ),
    [allowedEntityKeys, metadata?.entities]
  );
  const selectedEntity =
    availableEntities.find((entity) => entity.key === selectedEntityKey) ?? null;
  const activeLookups = entityData?.lookups ?? metadata?.lookups ?? {};
  const filterFields = useMemo(
    () =>
      (selectedEntity?.formFields ?? []).filter(
        (field) =>
          !field.readOnly &&
          !field.hiddenInList &&
          (field.type === "select" || field.type === "boolean")
      ),
    [selectedEntity]
  );
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const enabledActionCount = selectedEntity
    ? Object.values(selectedEntity.capability).filter(Boolean).length
    : 0;
  const canOpenPrimaryEditor = Boolean(
    selectedEntity &&
      (selectedEntity.singleton
        ? selectedEntity.capability.update || selectedEntity.capability.create
        : selectedEntity.capability.create)
  );

  useEffect(() => {
    if (!availableEntities.length) {
      setSelectedEntityKey(null);
      return;
    }

    const hasCurrentSelection = availableEntities.some(
      (entity) => entity.key === selectedEntityKey
    );

    if (hasCurrentSelection) {
      return;
    }

    const nextSelection =
      (initialEntityKey &&
        availableEntities.find((entity) => entity.key === initialEntityKey)?.key) ||
      availableEntities[0]?.key ||
      null;

    startTransition(() => {
      setSelectedEntityKey(nextSelection);
    });
  }, [availableEntities, initialEntityKey, selectedEntityKey]);

  useEffect(() => {
    setSearch("");
    setFilters({});
  }, [selectedEntityKey]);

  useEffect(() => {
    if (!selectedEntity) {
      setEntityData(null);
      return;
    }

    const entity = selectedEntity;
    let cancelled = false;

    async function loadEntity() {
      setLoadingEntity(true);
      try {
        const params = new URLSearchParams({
          limit: entity.singleton ? "1" : "50",
          offset: "0",
        });

        if (!entity.singleton && deferredSearch.trim()) {
          params.set("search", deferredSearch.trim());
        }

        for (const [filterKey, filterValue] of Object.entries(filters)) {
          if (filterValue) {
            params.set(filterKey, filterValue);
          }
        }

        const response = await fetch(
          `/api/admin/entities/${entity.key}?${params.toString()}`,
          { cache: "no-store" }
        );
        const payload = (await response.json().catch(() => ({}))) as
          | AdminListResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            ("error" in payload ? payload.error : undefined) ||
              "Failed to load records"
          );
        }

        if (!cancelled) {
          setEntityData(payload as AdminListResponse);
          setRealtimeIssue((current) =>
            current?.includes("Failed to catch up") ? null : current
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load records"
          );
          setEntityData(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingEntity(false);
        }
      }
    }

    void loadEntity();

    return () => {
      cancelled = true;
    };
  }, [selectedEntity, deferredSearch, filters, refreshTick]);

  useEffect(() => {
    if (!selectedEntity) {
      setActivity([]);
      return;
    }

    const entity = selectedEntity;
    let cancelled = false;

    async function loadActivity() {
      setLoadingActivity(true);
      try {
        const response = await fetch(
          `/api/admin/activity?limit=6&entityType=${entity.key}`,
          { cache: "no-store" }
        );
        const payload = (await response.json().catch(() => ({}))) as
          | AdminActivityResponse
          | { error?: string };

        if (!response.ok) {
          if (!cancelled) {
            setActivity([]);
            setActivityUnavailable(true);
          }
          return;
        }

        if (!cancelled) {
          setActivity((payload as AdminActivityResponse).items);
          setActivityUnavailable(false);
        }
      } catch (error) {
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
  }, [selectedEntity, refreshTick]);

  useRealtimeGateway({
    enabled: Boolean(metadata?.realtimeFeed),
    feedStreamId: metadata?.realtimeFeed,
    onEvent: (event) => {
      setRealtimeIssue(null);
      if (!selectedEntityKey) {
        refreshMetadata();
        return;
      }

      if (event.entityType !== selectedEntityKey && event.entityType !== "settings") {
        return;
      }

      startTransition(() => {
        refreshMetadata();
        setRefreshTick((current) => current + 1);
      });
    },
    onError: (error) => {
      setRealtimeIssue(error.message);
    },
  });

  function openCreateDialog() {
    if (!selectedEntity) return;
    setEditingItemId(null);
    setFormValues(buildFormValues(selectedEntity));
    setDialogOpen(true);
  }

  function openEditDialog(item: Record<string, unknown>) {
    if (!selectedEntity) return;
    const itemId =
      String(item[selectedEntity.primaryKey] ?? selectedEntity.singletonId ?? "");
    setEditingItemId(itemId);
    setFormValues(buildFormValues(selectedEntity, item));
    setDialogOpen(true);
  }

  function openPrimaryDialog() {
    if (!selectedEntity) return;

    if (selectedEntity.singleton) {
      const currentItem = entityData?.items[0];
      if (currentItem) {
        openEditDialog(currentItem);
        return;
      }
    }

    openCreateDialog();
  }

  function updateFormValue(key: string, value: unknown) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateFilterValue(key: string, value: string) {
    setFilters((current) => {
      const next = { ...current };
      if (!value) {
        delete next[key];
        return next;
      }

      next[key] = value;
      return next;
    });
  }

  function clearAllFilters() {
    setSearch("");
    setFilters({});
  }

  async function handleDelete(item: Record<string, unknown>) {
    if (!selectedEntity?.capability.delete) return;
    const itemId = String(item[selectedEntity.primaryKey] ?? "");
    if (!itemId) return;

    const confirmed = window.confirm(
      `Delete this ${selectedEntity.singularLabel.toLowerCase()}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/entities/${selectedEntity.key}/${itemId}`,
        {
          method: "DELETE",
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Delete failed");
      }

      toast.success(`${selectedEntity.singularLabel} deleted`);
      startTransition(() => {
        refreshMetadata();
        setRefreshTick((current) => current + 1);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function handleSave() {
    if (!selectedEntity) return;
    const entity = selectedEntity;

    const payload: Record<string, unknown> = {};
    for (const field of entity.formFields) {
      if (field.readOnly) continue;
      payload[field.key] = formValues[field.key];
    }

    setSaving(true);
    try {
      const isUpdate = Boolean(editingItemId);
      const itemId = editingItemId ?? entity.singletonId ?? "app";
      const response = await fetch(
        isUpdate
          ? `/api/admin/entities/${entity.key}/${itemId}`
          : `/api/admin/entities/${entity.key}`,
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json().catch(() => ({}))) as
        | AdminItemResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          ("error" in result ? result.error : undefined) || "Save failed"
        );
      }

      toast.success(
        `${entity.singularLabel} ${isUpdate ? "updated" : "created"}`
      );
      setDialogOpen(false);
      startTransition(() => {
        refreshMetadata();
        setRefreshTick((current) => current + 1);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: AdminFieldConfig) {
    const value = formValues[field.key];
    const disabled = Boolean(field.readOnly);
    const selectValue =
      typeof value === "string" && value.length > 0 ? value : EMPTY_SELECT_VALUE;
    const options = getFieldOptions(field, activeLookups);

    if (field.type === "textarea" || field.type === "json") {
      return (
        <Textarea
          id={field.key}
          value={typeof value === "string" ? value : ""}
          rows={field.type === "json" ? 10 : 4}
          onChange={(event) => updateFormValue(field.key, event.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    }

    if (field.type === "boolean") {
      return (
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => updateFormValue(field.key, checked)}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">
            Toggle {field.label.toLowerCase()}
          </span>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <Select
          value={selectValue}
          onValueChange={(nextValue) =>
            updateFormValue(
              field.key,
              nextValue === EMPTY_SELECT_VALUE ? "" : nextValue
            )
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>Not set</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const type =
      field.type === "number"
        ? "number"
        : field.type === "email"
          ? "email"
          : field.type === "tel"
            ? "tel"
            : field.type === "date"
              ? "date"
              : field.type === "datetime"
                ? "datetime-local"
                : "text";

    return (
      <Input
        id={field.key}
        type={type}
        value={typeof value === "string" || typeof value === "number" ? value : ""}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          updateFormValue(field.key, event.target.value)
        }
        placeholder={field.placeholder}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3.5 w-3.5" />
              Live Sync
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              Registry CRUD
            </Badge>
            {realtimeIssue ? (
              <Badge variant="outline">Manual Refresh Fallback</Badge>
            ) : null}
            {metadata?.settingsWritable ? (
              <Badge variant="secondary">Settings Ready</Badge>
            ) : (
              <Badge variant="destructive">Migration Required</Badge>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              startTransition(() => {
                refreshMetadata();
                setRefreshTick((current) => current + 1);
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canOpenPrimaryEditor && (
            <Button onClick={openPrimaryDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {selectedEntity?.singleton
                ? `Edit ${selectedEntity.singularLabel}`
                : `Add ${selectedEntity?.singularLabel ?? "Record"}`}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visible Entities</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingMetadata ? "..." : availableEntities.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Registry-backed modules available for this view
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Selected Records</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingEntity ? "..." : entityData?.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Filtered rows for the active entity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled Actions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledActionCount}</div>
            <p className="text-xs text-muted-foreground">
              Current role permissions for the active entity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingActivity ? "..." : activity.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activityUnavailable
                ? "Activity is temporarily unavailable; CRUD remains active."
                : "Latest realtime mutations for this entity"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Managed Entities
          </CardTitle>
          <CardDescription>
            The registry below drives the shared CRUD layer, policy checks, and
            module visibility across the admin experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingMetadata ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading entities...
            </div>
          ) : metadataError ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              {metadataError}
            </div>
          ) : availableEntities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No entities are available for your role.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableEntities.map((entity) => (
                <button
                  key={entity.key}
                  type="button"
                  onClick={() => {
                    setSelectedEntityKey(entity.key);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors",
                    selectedEntity?.key === entity.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entity.label}</span>
                    {typeof entity.count === "number" && (
                      <Badge variant="secondary">{entity.count}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entity.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEntity && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle>{selectedEntity.label}</CardTitle>
                <CardDescription>{selectedEntity.description}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedEntity.capability.read ? "secondary" : "outline"}>
                  Read {selectedEntity.capability.read ? "On" : "Off"}
                </Badge>
                <Badge
                  variant={selectedEntity.capability.create ? "secondary" : "outline"}
                >
                  Create {selectedEntity.capability.create ? "On" : "Off"}
                </Badge>
                <Badge
                  variant={selectedEntity.capability.update ? "secondary" : "outline"}
                >
                  Update {selectedEntity.capability.update ? "On" : "Off"}
                </Badge>
                <Badge
                  variant={selectedEntity.capability.delete ? "secondary" : "outline"}
                >
                  Delete {selectedEntity.capability.delete ? "On" : "Off"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedEntity.singleton && (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={
                        selectedEntity.searchPlaceholder ??
                        `Search ${selectedEntity.label.toLowerCase()}`
                      }
                      className="lg:max-w-md"
                    />
                    <div className="flex flex-wrap gap-2">
                      {filterFields.map((field) => {
                        const options = getFieldOptions(field, activeLookups);
                        const filterValue = filters[field.key] ?? "";

                        if (field.type === "boolean") {
                          return (
                            <Select
                              key={field.key}
                              value={filterValue || ALL_FILTER_VALUE}
                              onValueChange={(value) =>
                                updateFilterValue(
                                  field.key,
                                  value === ALL_FILTER_VALUE ? "" : value
                                )
                              }
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={field.label} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ALL_FILTER_VALUE}>
                                  All {field.label}
                                </SelectItem>
                                <SelectItem value="true">Enabled</SelectItem>
                                <SelectItem value="false">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        }

                        if (!options.length) {
                          return null;
                        }

                        return (
                          <Select
                            key={field.key}
                            value={filterValue || ALL_FILTER_VALUE}
                            onValueChange={(value) =>
                              updateFilterValue(
                                field.key,
                                value === ALL_FILTER_VALUE ? "" : value
                              )
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={field.label} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ALL_FILTER_VALUE}>
                                All {field.label}
                              </SelectItem>
                              {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })}
                      {(search || activeFilterCount > 0) && (
                        <Button variant="ghost" onClick={clearAllFilters}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Realtime events refresh the list automatically. Filters are
                    applied through the generic admin API.
                  </p>
                </div>
              )}

              {loadingEntity ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading {selectedEntity.label.toLowerCase()}...
                </div>
              ) : !entityData || entityData.items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No {selectedEntity.label.toLowerCase()} found.
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedEntity.listFields.map((fieldKey) => {
                          const field = selectedEntity.formFields.find(
                            (entry) => entry.key === fieldKey
                          );
                          return (
                            <TableHead key={fieldKey}>
                              {field?.label ?? fieldKey}
                            </TableHead>
                          );
                        })}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityData.items.map((item) => (
                        <TableRow
                          key={String(
                            item[selectedEntity.primaryKey] ??
                              selectedEntity.singletonId ??
                              selectedEntity.key
                          )}
                        >
                          {selectedEntity.listFields.map((fieldKey) => {
                            const field = selectedEntity.formFields.find(
                              (entry) => entry.key === fieldKey
                            );
                            return (
                              <TableCell key={fieldKey}>
                                {formatCellValue(field, item[fieldKey], activeLookups)}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {selectedEntity.capability.update && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {selectedEntity.capability.delete &&
                                !selectedEntity.singleton && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(item)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Recent Entity Activity</CardTitle>
                {activityUnavailable ? (
                  <Badge variant="outline">Activity Feed Unavailable</Badge>
                ) : null}
              </div>
              <CardDescription>
                The latest admin mutations for {selectedEntity.label.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingActivity ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading activity...
                </div>
              ) : activity.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No recent activity for this entity yet.
                </div>
              ) : (
                activity.map((item) => (
                  <div key={item.eventId} className="rounded-xl border px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatActivityLabel(item)}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedEntity.singularLabel} ID: {item.entityId}
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItemId ? "Edit" : "Create"} {selectedEntity?.singularLabel}
            </DialogTitle>
            <DialogDescription>{selectedEntity?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {selectedEntity?.formFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {renderField(field)}
                {field.description && (
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingItemId ? "Save Changes" : "Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
