-- =============================================================================
-- MosqueConnect Production Schema
-- =============================================================================
-- This is the unified, idempotent migration for the MosqueConnect database.
-- It uses TEXT primary keys for profiles (compatible with Clerk user IDs).
-- RLS policies use permissive rules since auth is handled at the API layer by Clerk.
-- =============================================================================

-- =====================
-- 1. PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,                    -- Clerk user ID (e.g., user_xxx)
  email TEXT,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'shura', 'imam', 'member')),
  mosque_id UUID,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  locale TEXT DEFAULT 'en-US',
  metadata JSONB DEFAULT '{}'::jsonb,
  privacy_settings JSONB DEFAULT '{
    "phone": "private",
    "email": "private",
    "bio": "public",
    "avatar_url": "public",
    "full_name": "public"
  }'::jsonb,
  last_seen_at TIMESTAMPTZ,
  profession TEXT,
  education TEXT,
  languages TEXT[],
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_mosque_id ON public.profiles(mosque_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================
-- 2. MOSQUES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.mosques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  image_url TEXT,
  facilities TEXT[],
  capacity INTEGER,
  established_year INTEGER,
  is_verified BOOLEAN DEFAULT false,
  admin_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mosques_city ON public.mosques(city);
CREATE INDEX IF NOT EXISTS idx_mosques_admin_id ON public.mosques(admin_id);

ALTER TABLE public.mosques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mosques_select_all" ON public.mosques;
CREATE POLICY "mosques_select_all" ON public.mosques FOR SELECT USING (true);
DROP POLICY IF EXISTS "mosques_insert" ON public.mosques;
CREATE POLICY "mosques_insert" ON public.mosques FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "mosques_update" ON public.mosques;
CREATE POLICY "mosques_update" ON public.mosques FOR UPDATE USING (true);


-- =====================
-- 3. IMAMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.imams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  mosque_id UUID REFERENCES public.mosques(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  specializations TEXT[],
  education TEXT,
  experience_years INTEGER,
  languages TEXT[],
  bio TEXT,
  image_url TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  appointed_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.imams
  DROP CONSTRAINT IF EXISTS imams_mosque_id_fkey;
ALTER TABLE public.imams
  ADD CONSTRAINT imams_mosque_id_fkey
  FOREIGN KEY (mosque_id) REFERENCES public.mosques(id) ON DELETE SET NULL;
ALTER TABLE public.imams
  ALTER COLUMN mosque_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_imams_profile_id ON public.imams(profile_id);
CREATE INDEX IF NOT EXISTS idx_imams_mosque_id ON public.imams(mosque_id);
CREATE INDEX IF NOT EXISTS idx_imams_is_active ON public.imams(is_active);

ALTER TABLE public.imams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imams_select_all" ON public.imams;
CREATE POLICY "imams_select_all" ON public.imams FOR SELECT USING (true);
DROP POLICY IF EXISTS "imams_insert" ON public.imams;
CREATE POLICY "imams_insert" ON public.imams FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "imams_update" ON public.imams;
CREATE POLICY "imams_update" ON public.imams FOR UPDATE USING (true);

DROP TRIGGER IF EXISTS imams_updated_at ON public.imams;
CREATE TRIGGER imams_updated_at
  BEFORE UPDATE ON public.imams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================
-- 3B. IMAM APPOINTMENTS
-- =====================
CREATE TABLE IF NOT EXISTS public.imam_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imam_id UUID NOT NULL REFERENCES public.imams(id) ON DELETE CASCADE,
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  role_title TEXT,
  appointed_date DATE,
  ended_at DATE,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(imam_id, mosque_id)
);

CREATE INDEX IF NOT EXISTS idx_imam_appointments_imam_id ON public.imam_appointments(imam_id);
CREATE INDEX IF NOT EXISTS idx_imam_appointments_mosque_id ON public.imam_appointments(mosque_id);
CREATE INDEX IF NOT EXISTS idx_imam_appointments_is_primary ON public.imam_appointments(is_primary);
CREATE INDEX IF NOT EXISTS idx_imam_appointments_is_active ON public.imam_appointments(is_active);

ALTER TABLE public.imam_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imam_appointments_select" ON public.imam_appointments;
CREATE POLICY "imam_appointments_select" ON public.imam_appointments FOR SELECT USING (true);
DROP POLICY IF EXISTS "imam_appointments_insert" ON public.imam_appointments;
CREATE POLICY "imam_appointments_insert" ON public.imam_appointments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "imam_appointments_update" ON public.imam_appointments;
CREATE POLICY "imam_appointments_update" ON public.imam_appointments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "imam_appointments_delete" ON public.imam_appointments;
CREATE POLICY "imam_appointments_delete" ON public.imam_appointments FOR DELETE USING (true);

DROP TRIGGER IF EXISTS imam_appointments_updated_at ON public.imam_appointments;
CREATE TRIGGER imam_appointments_updated_at
  BEFORE UPDATE ON public.imam_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.imam_appointments (
  imam_id,
  mosque_id,
  role_title,
  appointed_date,
  is_primary,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  mosque_id,
  title,
  appointed_date,
  true,
  is_active,
  created_at,
  updated_at
FROM public.imams
WHERE mosque_id IS NOT NULL
ON CONFLICT (imam_id, mosque_id) DO UPDATE
SET
  role_title = COALESCE(public.imam_appointments.role_title, EXCLUDED.role_title),
  appointed_date = COALESCE(public.imam_appointments.appointed_date, EXCLUDED.appointed_date),
  is_primary = public.imam_appointments.is_primary OR EXCLUDED.is_primary,
  is_active = public.imam_appointments.is_active OR EXCLUDED.is_active,
  updated_at = now();


-- =====================
-- 4. PRAYER TIMES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  fajr_adhan TIME, fajr_iqama TIME,
  sunrise TIME,
  dhuhr_adhan TIME, dhuhr_iqama TIME,
  asr_adhan TIME, asr_iqama TIME,
  maghrib_adhan TIME, maghrib_iqama TIME,
  isha_adhan TIME, isha_iqama TIME,
  jummah_time TIME, jummah_iqama TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mosque_id, date)
);

ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prayer_times_select_all" ON public.prayer_times;
CREATE POLICY "prayer_times_select_all" ON public.prayer_times FOR SELECT USING (true);
DROP POLICY IF EXISTS "prayer_times_insert" ON public.prayer_times;
CREATE POLICY "prayer_times_insert" ON public.prayer_times FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "prayer_times_update" ON public.prayer_times;
CREATE POLICY "prayer_times_update" ON public.prayer_times FOR UPDATE USING (true);


-- =====================
-- 5. EVENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'general',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  image_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  max_attendees INTEGER,
  registration_required BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_mosque_id ON public.events(mosque_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select_all" ON public.events;
CREATE POLICY "events_select_all" ON public.events FOR SELECT USING (true);
DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (true);


-- =====================
-- 6. EVENT REGISTRATIONS
-- =====================
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_reg_select_all" ON public.event_registrations;
CREATE POLICY "event_reg_select_all" ON public.event_registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "event_reg_insert" ON public.event_registrations;
CREATE POLICY "event_reg_insert" ON public.event_registrations FOR INSERT WITH CHECK (true);


-- =====================
-- 7. POSTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mosque_id UUID REFERENCES public.mosques(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  post_type TEXT DEFAULT 'text',
  category TEXT DEFAULT 'general',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  metadata JSONB DEFAULT '{}'::jsonb,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_mosque_id ON public.posts(mosque_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select_published" ON public.posts;
CREATE POLICY "posts_select_published" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "posts_update" ON public.posts;
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (true);


-- =====================
-- 8. POST LIKES
-- =====================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_likes_select" ON public.post_likes;
CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (true);


-- =====================
-- 9. POST COMMENTS
-- =====================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_comments_select" ON public.post_comments;
CREATE POLICY "post_comments_select" ON public.post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "post_comments_update" ON public.post_comments;
CREATE POLICY "post_comments_update" ON public.post_comments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "post_comments_delete" ON public.post_comments;
CREATE POLICY "post_comments_delete" ON public.post_comments FOR DELETE USING (true);


-- =====================
-- 10. POST BOOKMARKS
-- =====================
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON public.post_bookmarks(user_id);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_bookmarks_select" ON public.post_bookmarks;
CREATE POLICY "post_bookmarks_select" ON public.post_bookmarks FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_bookmarks_insert" ON public.post_bookmarks;
CREATE POLICY "post_bookmarks_insert" ON public.post_bookmarks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "post_bookmarks_delete" ON public.post_bookmarks;
CREATE POLICY "post_bookmarks_delete" ON public.post_bookmarks FOR DELETE USING (true);

-- =====================
-- 11. USER FOLLOWS
-- =====================
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_follows_select" ON public.user_follows;
CREATE POLICY "user_follows_select" ON public.user_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_follows_insert" ON public.user_follows;
CREATE POLICY "user_follows_insert" ON public.user_follows FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "user_follows_delete" ON public.user_follows;
CREATE POLICY "user_follows_delete" ON public.user_follows FOR DELETE USING (true);


-- =====================
-- 12. ANNOUNCEMENTS
-- =====================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE USING (true);


-- =====================
-- 13. ADMIN SETTINGS
-- =====================
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
    "imam_appointments": { "read": true, "create": true, "update": true, "delete": true },
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


-- =====================
-- 14. MANAGEMENT TEAMS
-- =====================
CREATE TABLE IF NOT EXISTS public.management_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_type TEXT DEFAULT 'operations',
  description TEXT,
  lead_profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_teams_mosque_id ON public.management_teams(mosque_id);
CREATE INDEX IF NOT EXISTS idx_management_teams_lead_profile_id ON public.management_teams(lead_profile_id);
CREATE INDEX IF NOT EXISTS idx_management_teams_is_active ON public.management_teams(is_active);

ALTER TABLE public.management_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "management_teams_select" ON public.management_teams;
CREATE POLICY "management_teams_select" ON public.management_teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "management_teams_insert" ON public.management_teams;
CREATE POLICY "management_teams_insert" ON public.management_teams FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "management_teams_update" ON public.management_teams;
CREATE POLICY "management_teams_update" ON public.management_teams FOR UPDATE USING (true);
DROP POLICY IF EXISTS "management_teams_delete" ON public.management_teams;
CREATE POLICY "management_teams_delete" ON public.management_teams FOR DELETE USING (true);

DROP TRIGGER IF EXISTS management_teams_updated_at ON public.management_teams;
CREATE TRIGGER management_teams_updated_at
  BEFORE UPDATE ON public.management_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================
-- 15. MANAGEMENT TEAM MEMBERS
-- =====================
CREATE TABLE IF NOT EXISTS public.management_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.management_teams(id) ON DELETE CASCADE,
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  responsibilities TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_management_team_members_team_id ON public.management_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_management_team_members_mosque_id ON public.management_team_members(mosque_id);
CREATE INDEX IF NOT EXISTS idx_management_team_members_profile_id ON public.management_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_management_team_members_is_active ON public.management_team_members(is_active);

ALTER TABLE public.management_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "management_team_members_select" ON public.management_team_members;
CREATE POLICY "management_team_members_select" ON public.management_team_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "management_team_members_insert" ON public.management_team_members;
CREATE POLICY "management_team_members_insert" ON public.management_team_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "management_team_members_update" ON public.management_team_members;
CREATE POLICY "management_team_members_update" ON public.management_team_members FOR UPDATE USING (true);
DROP POLICY IF EXISTS "management_team_members_delete" ON public.management_team_members;
CREATE POLICY "management_team_members_delete" ON public.management_team_members FOR DELETE USING (true);

DROP TRIGGER IF EXISTS management_team_members_updated_at ON public.management_team_members;
CREATE TRIGGER management_team_members_updated_at
  BEFORE UPDATE ON public.management_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================
-- 16. MOSQUE TASKS
-- =====================
CREATE TABLE IF NOT EXISTS public.mosque_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.management_teams(id) ON DELETE SET NULL,
  assigned_to_profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'operations',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mosque_tasks_mosque_id ON public.mosque_tasks(mosque_id);
CREATE INDEX IF NOT EXISTS idx_mosque_tasks_team_id ON public.mosque_tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_mosque_tasks_assigned_to_profile_id ON public.mosque_tasks(assigned_to_profile_id);
CREATE INDEX IF NOT EXISTS idx_mosque_tasks_status ON public.mosque_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mosque_tasks_due_at ON public.mosque_tasks(due_at);

ALTER TABLE public.mosque_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mosque_tasks_select" ON public.mosque_tasks;
CREATE POLICY "mosque_tasks_select" ON public.mosque_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "mosque_tasks_insert" ON public.mosque_tasks;
CREATE POLICY "mosque_tasks_insert" ON public.mosque_tasks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "mosque_tasks_update" ON public.mosque_tasks;
CREATE POLICY "mosque_tasks_update" ON public.mosque_tasks FOR UPDATE USING (true);
DROP POLICY IF EXISTS "mosque_tasks_delete" ON public.mosque_tasks;
CREATE POLICY "mosque_tasks_delete" ON public.mosque_tasks FOR DELETE USING (true);

DROP TRIGGER IF EXISTS mosque_tasks_updated_at ON public.mosque_tasks;
CREATE TRIGGER mosque_tasks_updated_at
  BEFORE UPDATE ON public.mosque_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================
-- 17. DONATIONS
-- =====================
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  donor_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  donation_type TEXT DEFAULT 'general',
  payment_method TEXT,
  transaction_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donations_select" ON public.donations;
CREATE POLICY "donations_select" ON public.donations FOR SELECT USING (true);
DROP POLICY IF EXISTS "donations_insert" ON public.donations;
CREATE POLICY "donations_insert" ON public.donations FOR INSERT WITH CHECK (true);


-- =====================
-- 18. SHURA MEMBERS
-- =====================
CREATE TABLE IF NOT EXISTS public.shura_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  responsibilities TEXT[],
  term_start DATE,
  term_end DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shura_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shura_members_select" ON public.shura_members;
CREATE POLICY "shura_members_select" ON public.shura_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "shura_members_insert" ON public.shura_members;
CREATE POLICY "shura_members_insert" ON public.shura_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "shura_members_update" ON public.shura_members;
CREATE POLICY "shura_members_update" ON public.shura_members FOR UPDATE USING (true);


-- =====================
-- 19. CONVERSATIONS
-- =====================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'broadcast')),
  image_url TEXT,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (true);
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE USING (true);


-- =====================
-- 20. CONVERSATION PARTICIPANTS
-- =====================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  last_read_message_id UUID,
  folder TEXT DEFAULT 'primary' CHECK (folder IN ('primary', 'requests', 'archived')),
  membership_state TEXT DEFAULT 'active' CHECK (membership_state IN ('requested', 'active', 'left', 'removed')),
  is_muted BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_folder_state ON public.conversation_participants(user_id, folder, membership_state, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_last_read_message ON public.conversation_participants(last_read_message_id);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_participants_select" ON public.conversation_participants;
CREATE POLICY "conv_participants_select" ON public.conversation_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "conv_participants_insert" ON public.conversation_participants;
CREATE POLICY "conv_participants_insert" ON public.conversation_participants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "conv_participants_update" ON public.conversation_participants;
CREATE POLICY "conv_participants_update" ON public.conversation_participants FOR UPDATE USING (true);


-- =====================
-- 21. MESSAGES
-- =====================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  image_url TEXT,
  file_url TEXT,
  file_name TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE USING (true);

ALTER TABLE public.conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_last_read_message_id_fkey;
ALTER TABLE public.conversation_participants
  ADD CONSTRAINT conversation_participants_last_read_message_id_fkey
  FOREIGN KEY (last_read_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


-- =====================
-- 22. MESSAGE READS
-- =====================
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_reads_select" ON public.message_reads;
CREATE POLICY "message_reads_select" ON public.message_reads FOR SELECT USING (true);
DROP POLICY IF EXISTS "message_reads_insert" ON public.message_reads;
CREATE POLICY "message_reads_insert" ON public.message_reads FOR INSERT WITH CHECK (true);


-- =====================
-- 23. MESSAGE ATTACHMENTS
-- =====================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'file')),
  url TEXT NOT NULL,
  pathname TEXT,
  mime_type TEXT,
  name TEXT,
  size BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_sort ON public.message_attachments(message_id, sort_order, created_at);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_attachments_select" ON public.message_attachments;
CREATE POLICY "message_attachments_select" ON public.message_attachments FOR SELECT USING (true);
DROP POLICY IF EXISTS "message_attachments_insert" ON public.message_attachments;
CREATE POLICY "message_attachments_insert" ON public.message_attachments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "message_attachments_update" ON public.message_attachments;
CREATE POLICY "message_attachments_update" ON public.message_attachments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "message_attachments_delete" ON public.message_attachments;
CREATE POLICY "message_attachments_delete" ON public.message_attachments FOR DELETE USING (true);


-- =====================
-- 24. MESSAGE REACTIONS
-- =====================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_created ON public.message_reactions(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_message ON public.message_reactions(user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_user ON public.message_reads(message_id, user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_reactions_select" ON public.message_reactions;
CREATE POLICY "message_reactions_select" ON public.message_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "message_reactions_insert" ON public.message_reactions;
CREATE POLICY "message_reactions_insert" ON public.message_reactions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "message_reactions_delete" ON public.message_reactions;
CREATE POLICY "message_reactions_delete" ON public.message_reactions FOR DELETE USING (true);


-- =====================
-- ENABLE REALTIME
-- =====================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.posts,
  public.profiles,
  public.management_teams,
  public.management_team_members,
  public.mosque_tasks,
  public.conversations,
  public.conversation_participants,
  public.messages,
  public.message_attachments,
  public.message_reactions,
  public.message_reads,
  public.post_likes,
  public.post_comments,
  public.user_follows;
