BEGIN;

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  blocker_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.user_mutes (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  muter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  reporter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id BIGINT REFERENCES public.post_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  report_id BIGINT NOT NULL REFERENCES public.content_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (report_id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  actor_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{
    "phone": "private",
    "email": "private",
    "bio": "public",
    "avatar_url": "public",
    "full_name": "public"
  }'::jsonb;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON public.user_mutes (muter_id, muted_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue (status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs (actor_user_id, created_at DESC);

DROP TRIGGER IF EXISTS moderation_queue_touch_updated_at ON public.moderation_queue;
CREATE TRIGGER moderation_queue_touch_updated_at
  BEFORE UPDATE ON public.moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

COMMIT;
