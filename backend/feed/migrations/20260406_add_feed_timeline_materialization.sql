-- Timeline materialization primitives for hybrid feed fan-out.
-- Uses fan-out on write for normal accounts and fan-out on read for high-follower accounts.

BEGIN;

CREATE TABLE IF NOT EXISTS public.feed_strategy_overrides (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL CHECK (strategy IN ('write', 'read')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS feed_strategy_overrides_touch_updated_at ON public.feed_strategy_overrides;
CREATE TRIGGER feed_strategy_overrides_touch_updated_at
  BEFORE UPDATE ON public.feed_strategy_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Materialized home timeline items for fan-out-on-write accounts.
CREATE TABLE IF NOT EXISTS public.feed_items (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  score TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, post_id)
);

-- Muted-user graph for filtering feed results.
CREATE TABLE IF NOT EXISTS public.mutes (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  muter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

-- Per-user timeline freshness marker used for stale-timeline recomputation fallback.
CREATE TABLE IF NOT EXISTS public.feed_timeline_state (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_recomputed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS feed_timeline_state_touch_updated_at ON public.feed_timeline_state;
CREATE TRIGGER feed_timeline_state_touch_updated_at
  BEFORE UPDATE ON public.feed_timeline_state
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Cursor-friendly indexes.
CREATE INDEX IF NOT EXISTS idx_feed_items_user_score_post
  ON public.feed_items (user_id, score DESC, post_id DESC);

CREATE INDEX IF NOT EXISTS idx_feed_items_post_id ON public.feed_items (post_id);
CREATE INDEX IF NOT EXISTS idx_mutes_muter_muted ON public.mutes (muter_id, muted_id);

COMMIT;
