BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{
    "phone": "private",
    "email": "private",
    "bio": "public",
    "avatar_url": "public",
    "full_name": "public"
  }'::jsonb;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

COMMIT;
