CREATE TABLE IF NOT EXISTS public.admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  site_name TEXT NOT NULL DEFAULT 'MosqueConnect',
  site_description TEXT,
  contact_email TEXT,
  support_phone TEXT,
  default_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  default_language TEXT NOT NULL DEFAULT 'en',
  date_format TEXT NOT NULL DEFAULT 'MM/dd/yyyy',
  calculation_method TEXT NOT NULL DEFAULT 'isna',
  notification_settings JSONB NOT NULL DEFAULT '{
    "emailNotifications": true,
    "pushNotifications": true,
    "prayerReminders": true,
    "eventReminders": true,
    "weeklyDigest": false
  }'::jsonb,
  privacy_settings JSONB NOT NULL DEFAULT '{
    "publicProfiles": false,
    "showMemberCount": true,
    "allowAnonymousDonations": true,
    "dataRetention": "365"
  }'::jsonb,
  module_settings JSONB NOT NULL DEFAULT '{
    "mosques": true,
    "events": true,
    "announcements": true,
    "imams": true,
    "donations": true,
    "community": true,
    "posts": true,
    "adminControlCenter": true,
    "shuraReadAccess": true
  }'::jsonb,
  shura_permissions JSONB NOT NULL DEFAULT '{
    "mosques": { "read": true, "create": true, "update": true, "delete": false },
    "prayer_times": { "read": true, "create": true, "update": true, "delete": true },
    "events": { "read": true, "create": true, "update": true, "delete": true },
    "announcements": { "read": true, "create": true, "update": true, "delete": true },
    "imams": { "read": true, "create": true, "update": true, "delete": true },
    "management_teams": { "read": true, "create": true, "update": true, "delete": true },
    "management_team_members": { "read": true, "create": true, "update": true, "delete": true },
    "mosque_tasks": { "read": true, "create": true, "update": true, "delete": true },
    "donations": { "read": true, "create": false, "update": true, "delete": false },
    "posts": { "read": true, "create": true, "update": true, "delete": true },
    "profiles": { "read": false, "create": false, "update": false, "delete": false },
    "settings": { "read": false, "create": false, "update": false, "delete": false }
  }'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT admin_settings_singleton CHECK (id = 'app')
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_settings_select" ON public.admin_settings;
CREATE POLICY "admin_settings_select" ON public.admin_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_settings_insert" ON public.admin_settings;
CREATE POLICY "admin_settings_insert" ON public.admin_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "admin_settings_update" ON public.admin_settings;
CREATE POLICY "admin_settings_update" ON public.admin_settings FOR UPDATE USING (true);

DROP TRIGGER IF EXISTS admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
