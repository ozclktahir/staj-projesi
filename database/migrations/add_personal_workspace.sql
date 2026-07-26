-- =============================================================================
-- Kişisel Alan: personal_notes, personal_todos, personal_files + Storage
-- Tarih: 26 Temmuz 2026
-- Supabase SQL Editor'de tamamını çalıştırın.
-- RLS: kullanıcı yalnızca auth.uid() = user_id satırlarını görür/yazar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) personal_notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_notes_user_created
  ON public.personal_notes (user_id, created_at DESC);

ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_notes_select_own" ON public.personal_notes;
DROP POLICY IF EXISTS "personal_notes_insert_own" ON public.personal_notes;
DROP POLICY IF EXISTS "personal_notes_update_own" ON public.personal_notes;
DROP POLICY IF EXISTS "personal_notes_delete_own" ON public.personal_notes;

CREATE POLICY "personal_notes_select_own"
  ON public.personal_notes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "personal_notes_insert_own"
  ON public.personal_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_notes_update_own"
  ON public.personal_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_notes_delete_own"
  ON public.personal_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2) personal_todos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  due_date DATE NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_todos_user_created
  ON public.personal_todos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_todos_user_due
  ON public.personal_todos (user_id, due_date);

ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_todos_select_own" ON public.personal_todos;
DROP POLICY IF EXISTS "personal_todos_insert_own" ON public.personal_todos;
DROP POLICY IF EXISTS "personal_todos_update_own" ON public.personal_todos;
DROP POLICY IF EXISTS "personal_todos_delete_own" ON public.personal_todos;

CREATE POLICY "personal_todos_select_own"
  ON public.personal_todos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "personal_todos_insert_own"
  ON public.personal_todos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_todos_update_own"
  ON public.personal_todos FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_todos_delete_own"
  ON public.personal_todos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3) personal_files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  storage_path TEXT NULL,
  file_size BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_files_user_created
  ON public.personal_files (user_id, created_at DESC);

ALTER TABLE public.personal_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_files_select_own" ON public.personal_files;
DROP POLICY IF EXISTS "personal_files_insert_own" ON public.personal_files;
DROP POLICY IF EXISTS "personal_files_update_own" ON public.personal_files;
DROP POLICY IF EXISTS "personal_files_delete_own" ON public.personal_files;

CREATE POLICY "personal_files_select_own"
  ON public.personal_files FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "personal_files_insert_own"
  ON public.personal_files FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_files_update_own"
  ON public.personal_files FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "personal_files_delete_own"
  ON public.personal_files FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4) Storage bucket: personal-files (özel — yalnızca kendi klasörü)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personal-files',
  'personal-files',
  false,
  26214400, -- 25 MB
  NULL
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "personal_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "personal_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "personal_files_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "personal_files_storage_delete" ON storage.objects;

CREATE POLICY "personal_files_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'personal-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "personal_files_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'personal-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "personal_files_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'personal-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "personal_files_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'personal-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
