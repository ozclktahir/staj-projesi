-- =============================================================================
-- activity_logs — Aktivite / Audit Feed
-- Dosya: add_activity_logs.sql
-- Tarih: 23 Temmuz 2026
-- Supabase SQL Editor'de tamamını çalıştırın.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NestJS ActivityLogService uyumluluğu (opsiyonel)
  entity_type TEXT,
  entity_id UUID,
  action TEXT
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.activity_logs
        DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
      ALTER TABLE public.activity_logs
        ADD CONSTRAINT activity_logs_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      ALTER TABLE public.activity_logs
        DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
      ALTER TABLE public.activity_logs
        ADD CONSTRAINT activity_logs_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END;
  ELSE
    ALTER TABLE public.activity_logs
      DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    ALTER TABLE public.activity_logs
      ADD CONSTRAINT activity_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created
  ON public.activity_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created
  ON public.activity_logs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_created
  ON public.activity_logs (task_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_members" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;

-- Workspace üyeleri (veya owner) log okuyabilir
CREATE POLICY "activity_logs_select_members"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- Kullanıcı yalnızca kendi user_id'si ile log yazabilir
CREATE POLICY "activity_logs_insert_own"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.is_workspace_member(workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = workspace_id AND w.owner_id = auth.uid()
      )
    )
  );
