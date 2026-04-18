import type {
  AdminSettingsRecord,
  AdminUserRole,
  ShuraEntityPermission,
  ShuraPermissionMap,
} from "@/lib/admin/types";

export const ADMIN_SETTINGS_SINGLETON_ID = "app";
export const ADMIN_REALTIME_FEED = "admin-control-center";
export const IMAM_REALTIME_FEED_PREFIX = "imam-control-center";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  prayerReminders: true,
  eventReminders: true,
  weeklyDigest: false,
};

export const DEFAULT_PRIVACY_SETTINGS = {
  publicProfiles: false,
  showMemberCount: true,
  allowAnonymousDonations: true,
  dataRetention: "365",
};

export const DEFAULT_MODULE_SETTINGS = {
  mosques: true,
  events: true,
  announcements: true,
  imams: true,
  donations: true,
  community: true,
  posts: true,
  adminControlCenter: true,
  shuraReadAccess: true,
};

const readonlyPermission = (): ShuraEntityPermission => ({
  read: true,
  create: false,
  update: false,
  delete: false,
});

export const DEFAULT_SHURA_PERMISSIONS: ShuraPermissionMap = {
  mosques: readonlyPermission(),
  prayer_times: readonlyPermission(),
  events: readonlyPermission(),
  announcements: readonlyPermission(),
  imams: readonlyPermission(),
  donations: {
    read: false,
    create: false,
    update: false,
    delete: false,
  },
  posts: readonlyPermission(),
  profiles: {
    read: false,
    create: false,
    update: false,
    delete: false,
  },
  settings: {
    read: false,
    create: false,
    update: false,
    delete: false,
  },
};

export function getImamRealtimeFeed(mosqueId: string): string {
  return `${IMAM_REALTIME_FEED_PREFIX}:${mosqueId}`;
}

export function resolveManagementRealtimeFeed(input: {
  role: AdminUserRole;
  mosqueId: string | null;
}): string {
  if (input.role === "imam" && input.mosqueId) {
    return getImamRealtimeFeed(input.mosqueId);
  }

  return ADMIN_REALTIME_FEED;
}

function normalizeBooleanRecord(
  value: unknown,
  fallback: Record<string, boolean>
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }

  const result: Record<string, boolean> = {};
  for (const [key, fallbackValue] of Object.entries(fallback)) {
    const nextValue = (value as Record<string, unknown>)[key];
    result[key] = typeof nextValue === "boolean" ? nextValue : fallbackValue;
  }
  return result;
}

export function normalizeShuraPermissions(value: unknown): ShuraPermissionMap {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const result = {} as ShuraPermissionMap;

  for (const [entityKey, fallbackPermission] of Object.entries(
    DEFAULT_SHURA_PERMISSIONS
  )) {
    const nextValue = source[entityKey];
    const nextPermission =
      nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)
        ? (nextValue as Record<string, unknown>)
        : {};

    result[entityKey as keyof ShuraPermissionMap] = {
      read:
        typeof nextPermission.read === "boolean"
          ? nextPermission.read
          : fallbackPermission.read,
      create:
        typeof nextPermission.create === "boolean"
          ? nextPermission.create
          : fallbackPermission.create,
      update:
        typeof nextPermission.update === "boolean"
          ? nextPermission.update
          : fallbackPermission.update,
      delete:
        typeof nextPermission.delete === "boolean"
          ? nextPermission.delete
          : fallbackPermission.delete,
    };
  }

  return result;
}

function normalizeObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

export function createDefaultAdminSettingsRecord(
  now = new Date().toISOString()
): AdminSettingsRecord {
  return {
    id: ADMIN_SETTINGS_SINGLETON_ID,
    site_name: "MosqueConnect",
    site_description: "Connecting Muslim communities with their local mosques",
    contact_email: "admin@mosqueconnect.org",
    support_phone: "+1 (800) 555-0199",
    default_timezone: "America/New_York",
    default_language: "en",
    date_format: "MM/dd/yyyy",
    calculation_method: "isna",
    notification_settings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    privacy_settings: { ...DEFAULT_PRIVACY_SETTINGS },
    module_settings: { ...DEFAULT_MODULE_SETTINGS },
    shura_permissions: { ...DEFAULT_SHURA_PERMISSIONS },
    metadata: {},
    created_by: null,
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function normalizeAdminSettingsRecord(
  value: Partial<AdminSettingsRecord> | null | undefined
): AdminSettingsRecord {
  const fallback = createDefaultAdminSettingsRecord();

  return {
    ...fallback,
    ...value,
    notification_settings: normalizeBooleanRecord(
      value?.notification_settings,
      DEFAULT_NOTIFICATION_SETTINGS
    ),
    privacy_settings: {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...normalizeObjectRecord(value?.privacy_settings),
    },
    module_settings: normalizeBooleanRecord(
      value?.module_settings,
      DEFAULT_MODULE_SETTINGS
    ),
    shura_permissions: normalizeShuraPermissions(value?.shura_permissions),
    metadata: normalizeObjectRecord(value?.metadata),
  };
}
