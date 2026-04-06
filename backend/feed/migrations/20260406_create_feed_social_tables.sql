-- Feed/social data model migration.
-- All event timestamps are persisted as TIMESTAMPTZ (UTC).
-- Local timezone conversion should happen in API/UI presentation layers.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Snowflake-style globally sortable IDs.
CREATE SEQUENCE IF NOT EXISTS public.global_snowflake_seq;

CREATE OR REPLACE FUNCTION public.next_snowflake_id()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  epoch_millis BIGINT := 1704067200000; -- 2024-01-01T00:00:00Z
  now_millis BIGINT;
  seq BIGINT;
BEGIN
  now_millis := floor(extract(epoch FROM clock_timestamp()) * 1000)::BIGINT;
  seq := nextval('public.global_snowflake_seq') & 4095; -- 12-bit sequence
  RETURN ((now_millis - epoch_millis) << 12) | seq;
END;
$$;

CREATE TABLE IF NOT EXISTS public.posts (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

ALTER TABLE public.posts
  ALTER COLUMN visibility SET DEFAULT 'public';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'content'
  ) THEN
    UPDATE public.posts
    SET body = COALESCE(body, content)
    WHERE body IS NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'likes_count'
  ) THEN
    UPDATE public.posts
    SET like_count = COALESCE(like_count, likes_count, 0);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'comments_count'
  ) THEN
    UPDATE public.posts
    SET comment_count = COALESCE(comment_count, comments_count, 0);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.post_media (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  media_url TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.comments (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.reactions (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (post_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS public.follows (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  follower_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  blocker_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id BIGINT PRIMARY KEY DEFAULT public.next_snowflake_id(),
  reporter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);

-- Composite indexes for feed reads and cursor pagination.
CREATE INDEX IF NOT EXISTS idx_posts_created_at_id ON public.posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id_created_at ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id_followee_id ON public.follows (follower_id, followee_id);

-- Additional practical read indexes.
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at_id ON public.comments (post_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id_created_at_id ON public.reactions (post_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id_blocked_id ON public.blocks (blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at_id ON public.reports (status, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_touch_updated_at ON public.posts;
CREATE TRIGGER posts_touch_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS comments_touch_updated_at ON public.comments;
CREATE TRIGGER comments_touch_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Transactional denormalized counters.
CREATE OR REPLACE FUNCTION public.bump_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS comments_counter_insert ON public.comments;
CREATE TRIGGER comments_counter_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_post_comment_count();

DROP TRIGGER IF EXISTS comments_counter_delete ON public.comments;
CREATE TRIGGER comments_counter_delete
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_post_comment_count();

CREATE OR REPLACE FUNCTION public.bump_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reactions_counter_insert ON public.reactions;
CREATE TRIGGER reactions_counter_insert
  AFTER INSERT ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_post_like_count();

DROP TRIGGER IF EXISTS reactions_counter_delete ON public.reactions;
CREATE TRIGGER reactions_counter_delete
  AFTER DELETE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_post_like_count();

COMMIT;
