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


ALTER TABLE public.admin_settings
  ALTER COLUMN shura_permissions SET DEFAULT '{
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
  }'::jsonb;

UPDATE public.admin_settings
SET shura_permissions =
  COALESCE(shura_permissions, '{}'::jsonb) || '{
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
  }'::jsonb
WHERE id = 'app';
