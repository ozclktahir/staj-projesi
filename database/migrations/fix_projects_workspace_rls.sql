-- =============================================================================
-- projects RLS — workspace_id ile INSERT/SELECT (teyit / yenileme)
-- Tarih: 21 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

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

DROP POLICY IF EXISTS "projects_insert_by_creator_and_member" ON public.projects;
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;

CREATE POLICY "projects_insert_by_creator_and_member"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id)
  );

CREATE POLICY "projects_select_member"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );

CREATE POLICY "projects_update_own"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );
