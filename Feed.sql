--
-- MosqueConnect: Consolidated Feed Feature Database Schema (v3)
-- Design: High Performance, Real-time Fast, Secure
-- Logic: Denormalized Counters & Pinned/Search/Hashtag Support
--

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Unified Category Enum
DO $$ BEGIN
    CREATE TYPE post_category AS ENUM ('general', 'announcement', 'event', 'discussion');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Post Type Enum
DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'poll');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES

-- Profiles: Linked to Clerk/Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- Clerk User ID
    full_name TEXT,
    username TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    bio TEXT,
    profession TEXT,
    role TEXT DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts: The central entity
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mosque_id UUID,
    body TEXT NOT NULL,
    image_url TEXT,
    post_type post_type DEFAULT 'text',
    category post_category DEFAULT 'general',
    metadata JSONB DEFAULT '{}'::jsonb,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers')),
    is_published BOOLEAN DEFAULT true,
    
    -- Added in Phase 3 upgrade
    pinned_at TIMESTAMPTZ, 
    tags TEXT[] DEFAULT '{}',
    media_urls TEXT[] DEFAULT '{}',
    
    -- Denormalized counters (Unified to plural)
    likes_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: In case table already exists but columns are missing
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE public.posts ADD COLUMN pinned_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN null; END;

    BEGIN
        ALTER TABLE public.posts ADD COLUMN tags TEXT[] DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN null; END;

    BEGIN
        ALTER TABLE public.posts ADD COLUMN media_urls TEXT[] DEFAULT '{}';
    EXCEPTION WHEN duplicate_column THEN null; END;
END $$;

-- Table for Reactions
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id, reaction_type)
);

-- Table for Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Bookmarks
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.post_comments(post_id);

-- 4. TRIGGER FUNCTIONS (AUTOMATION)
CREATE OR REPLACE FUNCTION public.update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'reactions') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF (TG_TABLE_NAME = 'post_comments') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. APPLY TRIGGERS (Deduplicated)
DROP TRIGGER IF EXISTS tr_update_like_count ON public.reactions;
CREATE TRIGGER tr_update_like_count
AFTER INSERT OR DELETE ON public.reactions
FOR EACH ROW EXECUTE FUNCTION public.update_post_counters();

DROP TRIGGER IF EXISTS tr_update_comment_count ON public.post_comments;
CREATE TRIGGER tr_update_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_counters();

-- 6. SAFETY & SOCIAL TABLES
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.user_mutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    muter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    muted_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(muter_id, muted_id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 7. INFRASTRUCTURE TABLES
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.realtime_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    idempotency_key TEXT UNIQUE,
    feed_stream_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ROW LEVEL SECURITY
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 7. REALTIME CONFIGURATION
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.posts, public.reactions, public.post_comments, public.profiles;
COMMIT;
