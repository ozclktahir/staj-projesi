-- =============================================================================
-- workspaces DELETE RLS — yalnızca sahip silebilir
-- Tarih: 21 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_own" ON public.workspaces;

CREATE POLICY "Users can delete own workspaces"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Üyelik satırlarını workspace sahibi silebilsin (cleanup)
DROP POLICY IF EXISTS "Workspace owners can delete members" ON public.workspace_members;
CREATE POLICY "Workspace owners can delete members"
  ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
