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

DROP TRIGGER IF EXISTS imams_updated_at ON public.imams;
CREATE TRIGGER imams_updated_at
  BEFORE UPDATE ON public.imams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


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
    "imam_appointments": { "read": true, "create": true, "update": true, "delete": true }
  }'::jsonb
WHERE id = 'app';
