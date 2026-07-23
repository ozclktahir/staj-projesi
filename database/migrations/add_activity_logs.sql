-- =============================================================================
-- activity_logs — Aktivite / Audit Feed (idempotent)
-- Dosya: add_activity_logs.sql
-- Tarih: 23 Temmuz 2026
--
-- Not: Tablo NestJS ActivityLogService ile daha önce oluşturulmuş olabilir
-- (workspace_id, user_id, entity_type, entity_id, action, details...).
-- CREATE TABLE IF NOT EXISTS mevcut tabloyu değiştirmez; bu yüzden eksik
-- sütunlar ALTER TABLE ... ADD COLUMN IF NOT EXISTS ile eklenir.
-- Supabase SQL Editor'de tamamını çalıştırın.
-- =============================================================================

-- 1) Temel tablo (yoksa Nest uyumlu iskelet)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Feed için gerekli sütunlar (mevcut tabloda yoksa ekle)
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS task_id UUID;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- details / created_at varsayılanları
ALTER TABLE public.activity_logs
  ALTER COLUMN details SET DEFAULT '{}'::jsonb;
ALTER TABLE public.activity_logs
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.activity_logs
SET details = '{}'::jsonb
WHERE details IS NULL;

UPDATE public.activity_logs
SET created_at = now()
WHERE created_at IS NULL;

-- Nest `action` → `action_type` geri doldurma
UPDATE public.activity_logs
SET action_type = COALESCE(NULLIF(trim(action_type), ''), action, 'unknown')
WHERE action_type IS NULL OR trim(action_type) = '';

-- 3) Foreign key'ler (hedef tablo/sütun varsa; tekrar çalıştırılabilir)
DO $$
BEGIN
  -- project_id → projects(id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'project_id'
  ) THEN
    BEGIN
      ALTER TABLE public.activity_logs
        DROP CONSTRAINT IF EXISTS activity_logs_project_id_fkey;
      ALTER TABLE public.activity_logs
        ADD CONSTRAINT activity_logs_project_id_fkey
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'activity_logs.project_id FK atlandı: %', SQLERRM;
    END;
  END IF;

  -- task_id → tasks(id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'task_id'
  ) THEN
    BEGIN
      ALTER TABLE public.activity_logs
        DROP CONSTRAINT IF EXISTS activity_logs_task_id_fkey;
      ALTER TABLE public.activity_logs
        ADD CONSTRAINT activity_logs_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'activity_logs.task_id FK atlandı: %', SQLERRM;
    END;
  END IF;

  -- user_id → profiles(id) veya auth.users(id)
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
      BEGIN
        ALTER TABLE public.activity_logs
          DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
        ALTER TABLE public.activity_logs
          ADD CONSTRAINT activity_logs_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'activity_logs.user_id FK atlandı: %', SQLERRM;
      END;
    END;
  ELSE
    BEGIN
      ALTER TABLE public.activity_logs
        DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
      ALTER TABLE public.activity_logs
        ADD CONSTRAINT activity_logs_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'activity_logs.user_id FK atlandı: %', SQLERRM;
    END;
  END IF;
END $$;

-- 4) İndeksler (sütunlar eklendikten sonra)
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created
  ON public.activity_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created
  ON public.activity_logs (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_task_created
  ON public.activity_logs (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type_created
  ON public.activity_logs (action_type, created_at DESC);

-- 5) RLS — workspace üyeleri okur; kullanıcı kendi adına yazar
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_members" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;

CREATE POLICY "activity_logs_select_members"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

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
