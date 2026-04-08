BEGIN;

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS membership_state TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_read_message_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversation_participants'::regclass
      AND conname = 'conversation_participants_folder_check'
  ) THEN
    ALTER TABLE public.conversation_participants
      ADD CONSTRAINT conversation_participants_folder_check
      CHECK (folder IN ('primary', 'requests', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversation_participants'::regclass
      AND conname = 'conversation_participants_membership_state_check'
  ) THEN
    ALTER TABLE public.conversation_participants
      ADD CONSTRAINT conversation_participants_membership_state_check
      CHECK (membership_state IN ('requested', 'active', 'left', 'removed'));
  END IF;
END $$;

ALTER TABLE public.conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_last_read_message_id_fkey;

ALTER TABLE public.conversation_participants
  ADD CONSTRAINT conversation_participants_last_read_message_id_fkey
  FOREIGN KEY (last_read_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conv_participants_user_folder_state
  ON public.conversation_participants (user_id, folder, membership_state, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_last_read_message
  ON public.conversation_participants (last_read_message_id);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_attachments_select" ON public.message_attachments;
CREATE POLICY "message_attachments_select" ON public.message_attachments FOR SELECT USING (true);
DROP POLICY IF EXISTS "message_attachments_insert" ON public.message_attachments;
CREATE POLICY "message_attachments_insert" ON public.message_attachments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "message_attachments_update" ON public.message_attachments;
CREATE POLICY "message_attachments_update" ON public.message_attachments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "message_attachments_delete" ON public.message_attachments;
CREATE POLICY "message_attachments_delete" ON public.message_attachments FOR DELETE USING (true);

DROP POLICY IF EXISTS "message_reactions_select" ON public.message_reactions;
CREATE POLICY "message_reactions_select" ON public.message_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "message_reactions_insert" ON public.message_reactions;
CREATE POLICY "message_reactions_insert" ON public.message_reactions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "message_reactions_delete" ON public.message_reactions;
CREATE POLICY "message_reactions_delete" ON public.message_reactions FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_sort
  ON public.message_attachments (message_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_created
  ON public.message_reactions (message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_message
  ON public.message_reactions (user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_user
  ON public.message_reads (message_id, user_id);

INSERT INTO public.message_attachments (message_id, kind, url, pathname, mime_type, name, size, sort_order, created_at)
SELECT m.id, 'image', m.image_url, NULL, NULL, NULL, NULL, 0, m.created_at
FROM public.messages m
WHERE m.image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.message_attachments a
    WHERE a.message_id = m.id
      AND a.url = m.image_url
  );

INSERT INTO public.message_attachments (message_id, kind, url, pathname, mime_type, name, size, sort_order, created_at)
SELECT m.id, 'file', m.file_url, NULL, NULL, m.file_name, NULL, 1, m.created_at
FROM public.messages m
WHERE m.file_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.message_attachments a
    WHERE a.message_id = m.id
      AND a.url = m.file_url
  );

ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.content_reports'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%post_id%'
      AND pg_get_constraintdef(oid) ILIKE '%comment_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.content_reports DROP CONSTRAINT %I', constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.content_reports'::regclass
      AND conname = 'content_reports_subject_check'
  ) THEN
    ALTER TABLE public.content_reports
      ADD CONSTRAINT content_reports_subject_check
      CHECK (num_nonnulls(post_id, comment_id, message_id) = 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_reports_message_id
  ON public.content_reports (message_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMIT;
