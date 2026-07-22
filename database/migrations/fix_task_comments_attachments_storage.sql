-- =============================================================================
-- task_comments + task_attachments + Storage (task-attachments)
-- Tarih: 22 Temmuz 2026
-- Supabase SQL Editor'de tamamını çalıştırın.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) task_comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_id → profiles.id (yoksa auth.users)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.task_comments
        DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
      ALTER TABLE public.task_comments
        ADD CONSTRAINT task_comments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      ALTER TABLE public.task_comments
        DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
      ALTER TABLE public.task_comments
        ADD CONSTRAINT task_comments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END;
  ELSE
    ALTER TABLE public.task_comments
      DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
    ALTER TABLE public.task_comments
      ADD CONSTRAINT task_comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
  ON public.task_comments (task_id, created_at);

-- Eski `comments` tablosundan veri aktar (varsa)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comments'
  ) THEN
    INSERT INTO public.task_comments (id, task_id, user_id, content, created_at)
    SELECT c.id, c.task_id, c.user_id, c.content, COALESCE(c.created_at, now())
    FROM public.comments c
    WHERE c.content IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.task_comments tc WHERE tc.id = c.id
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'comments → task_comments kopyası atlandı: %', SQLERRM;
END $$;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_comments_select_authenticated" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert_own" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete_own" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_update_own" ON public.task_comments;

CREATE POLICY "task_comments_select_authenticated"
  ON public.task_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "task_comments_insert_own"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comments_update_own"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comments_delete_own"
  ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Eski comments tablosu için silme politikası (geriye uyumluluk)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;
    CREATE POLICY "comments_delete_own"
      ON public.comments FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) task_attachments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.task_attachments
        DROP CONSTRAINT IF EXISTS task_attachments_user_id_fkey;
      ALTER TABLE public.task_attachments
        ADD CONSTRAINT task_attachments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      ALTER TABLE public.task_attachments
        DROP CONSTRAINT IF EXISTS task_attachments_user_id_fkey;
      ALTER TABLE public.task_attachments
        ADD CONSTRAINT task_attachments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END;
  ELSE
    ALTER TABLE public.task_attachments
      DROP CONSTRAINT IF EXISTS task_attachments_user_id_fkey;
    ALTER TABLE public.task_attachments
      ADD CONSTRAINT task_attachments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_created
  ON public.task_attachments (task_id, created_at);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_attachments_select_authenticated" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert_own" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete_own" ON public.task_attachments;

CREATE POLICY "task_attachments_select_authenticated"
  ON public.task_attachments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "task_attachments_insert_own"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_attachments_delete_own"
  ON public.task_attachments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3) Storage bucket: task-attachments
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  26214400, -- 25 MB
  NULL
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "task_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;

CREATE POLICY "task_attachments_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "task_attachments_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "task_attachments_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anon public read (public bucket URL'leri için)
DROP POLICY IF EXISTS "task_attachments_storage_public_read" ON storage.objects;
CREATE POLICY "task_attachments_storage_public_read"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'task-attachments');
