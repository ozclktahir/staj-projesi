-- =============================================================================
-- projects / tasks DELETE RLS + admin helper
-- Tarih: 22 Temmuz 2026
-- Supabase SQL Editor'de tamamını çalıştırın.
-- Amaç: Workspace Admin / proje sahibi proje ve bağlı görevleri silebilsin.
-- =============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Workspace sahibi veya Admin rolü
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_workspace_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = p_workspace_id
          AND w.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = auth.uid()
          AND upper(wm.role) IN ('ADMIN', 'OWNER')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;

-- Üyelik helper (yoksa / eskiyse yenile)
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_workspace_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = p_workspace_id AND w.owner_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;

-- Projects: UPDATE (soft-delete dahil) — sahip / oluşturan / admin / üye
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_workspace_admin(workspace_id)
    OR public.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_workspace_admin(workspace_id)
    OR public.is_workspace_member(workspace_id)
  );

-- Projects: DELETE — oluşturan / sahip / workspace admin
DROP POLICY IF EXISTS "projects_delete_admin_or_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_admin_or_owner"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR user_id = auth.uid()
      OR public.is_workspace_admin(workspace_id)
    )
  );

-- Tasks: DELETE — oluşturan / atanan / workspace üyesi veya admin
DROP POLICY IF EXISTS "tasks_delete_member_or_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_member_or_admin"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR assignee_id = auth.uid()
      OR assigned_to = auth.uid()
      OR public.is_workspace_admin(workspace_id)
      OR public.is_workspace_member(workspace_id)
    )
  );

-- Opsiyonel: tasks.project_id FK cascade (yoksa engellemesin)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'project_id'
  ) THEN
    BEGIN
      ALTER TABLE public.tasks
        DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;

    BEGIN
      ALTER TABLE public.tasks
        ADD CONSTRAINT tasks_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
