-- =============================================================================
-- Tasks/Projects: Member assignee görünürlüğü (RLS)
-- Tarih: 21 Temmuz 2026
-- Admin üyeye görev atadığında (assignee_id) üyenin SELECT edebilmesi için.
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id);
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks (assigned_to);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- is_workspace_member yoksa oluştur
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

-- Tasks SELECT: üye / creator / assignee
DROP POLICY IF EXISTS "tasks_select_member_or_assignee" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "tasks_select_member_or_assignee"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );

-- Tasks UPDATE: assignee kendi görevini güncelleyebilsin
DROP POLICY IF EXISTS "tasks_update_assignee_or_member" ON public.tasks;
CREATE POLICY "tasks_update_assignee_or_member"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );

-- Projects SELECT: workspace üyesi tüm projeleri okuyabilir
-- (uygulama katmanı MEMBER için filtre uygular)
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
CREATE POLICY "projects_select_member"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );
