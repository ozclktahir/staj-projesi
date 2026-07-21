-- =============================================================================
-- Task detail: parent_task_id (subtasks), due_date, comments RLS
-- Tarih: 21 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks (parent_task_id);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_task_created
  ON public.comments (task_id, created_at);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_authenticated" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;

-- Basit RLS: oturum açmış kullanıcı kendi yorumunu ekler / okur
CREATE POLICY "comments_select_authenticated"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "comments_insert_own"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
