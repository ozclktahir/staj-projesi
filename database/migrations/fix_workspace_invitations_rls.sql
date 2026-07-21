-- =============================================================================
-- Invite-only: workspace_invitations + RLS
-- Tarih: 21 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email_status
  ON public.workspace_invitations (lower(email), status);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace
  ON public.workspace_invitations (workspace_id);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select_own_email_or_admin" ON public.workspace_invitations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON public.workspace_invitations;
DROP POLICY IF EXISTS "invitations_update_own_or_admin" ON public.workspace_invitations;

-- Davetli kendi e-postasındaki daveti görebilir; admin/owner tümünü görür
CREATE POLICY "invitations_select_own_email_or_admin"
  ON public.workspace_invitations
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND lower(wm.role) IN ('admin', 'owner')
    )
  );

CREATE POLICY "invitations_insert_admin"
  ON public.workspace_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND (
      workspace_id IN (
        SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
      )
      OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND lower(wm.role) IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "invitations_update_own_or_admin"
  ON public.workspace_invitations
  FOR UPDATE
  TO authenticated
  USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND lower(wm.role) IN ('admin', 'owner')
    )
  )
  WITH CHECK (true);
