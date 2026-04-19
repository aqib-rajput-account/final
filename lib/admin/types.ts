export type AdminUserRole = "super_admin" | "admin" | "shura" | "imam" | "member";

export const ADMIN_ENTITY_KEYS = [
  "mosques",
  "prayer_times",
  "events",
  "announcements",
  "imams",
  "imam_appointments",
  "management_teams",
  "management_team_members",
  "mosque_tasks",
  "donations",
  "posts",
  "profiles",
  "settings",
] as const;

export type AdminEntityKey = (typeof ADMIN_ENTITY_KEYS)[number];

export const ADMIN_ENTITY_ACTIONS = ["read", "create", "update", "delete"] as const;

export type AdminEntityAction = (typeof ADMIN_ENTITY_ACTIONS)[number];

export type AdminFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "number"
  | "boolean"
  | "select"
  | "date"
  | "datetime"
  | "json"
  | "tags";

export interface AdminLookupOption {
  value: string;
  label: string;
}

export interface AdminFieldConfig {
  key: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  readOnly?: boolean;
  hiddenInList?: boolean;
  options?: AdminLookupOption[];
  lookup?: string;
}

export interface AdminEntityCapability {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface AdminEntitySummary {
  key: AdminEntityKey;
  label: string;
  singularLabel: string;
  description: string;
  table: string;
  primaryKey: string;
  listFields: string[];
  formFields: AdminFieldConfig[];
  searchPlaceholder?: string;
  singleton?: boolean;
  singletonId?: string;
  capability: AdminEntityCapability;
  count: number | null;
}

export interface ShuraEntityPermission {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export type ShuraPermissionMap = Record<AdminEntityKey, ShuraEntityPermission>;

export interface AdminSettingsRecord {
  id: string;
  site_name: string;
  site_description: string | null;
  contact_email: string | null;
  support_phone: string | null;
  default_timezone: string;
  default_language: string;
  date_format: string;
  calculation_method: string;
  notification_settings: Record<string, boolean>;
  privacy_settings: Record<string, unknown>;
  module_settings: Record<string, boolean>;
  shura_permissions: ShuraPermissionMap;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminEntitiesResponse {
  entities: AdminEntitySummary[];
  lookups: Record<string, AdminLookupOption[]>;
  moduleSettings: Record<string, boolean>;
  realtimeFeed: string;
  settingsWritable: boolean;
}

export interface AdminListResponse {
  entity: AdminEntitySummary;
  items: Record<string, unknown>[];
  total: number;
  lookups: Record<string, AdminLookupOption[]>;
}

export interface AdminItemResponse {
  entity: AdminEntitySummary;
  item: Record<string, unknown> | null;
  lookups: Record<string, AdminLookupOption[]>;
}

export interface AdminActivityEntry {
  eventId: number;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  actorName: string | null;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface AdminActivityResponse {
  items: AdminActivityEntry[];
}
