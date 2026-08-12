-- =============================================================================
-- Üye listesi görünürlüğü: workspace'teki HERKES (Member/Guest dahil) tüm
-- üyeleri (view-only) görebilsin. Rol değiştirme/çıkarma zaten ayrıca admin-only
-- (bkz. admin-members.ts server action + WorkspaceRoleGuard).
-- Tarih: 12 Ağustos 2026
--
-- Önceki durum: "Users can view own memberships" USING (user_id = auth.uid())
-- — Member/Guest yalnızca KENDİ satırını görebiliyordu; hatta workspace'in
-- gerçek sahibi (owner_id) olmayan bir Admin bile diğer üyeleri RLS
-- seviyesinde göremiyordu (yalnızca "Workspace owners can manage members"
-- politikası literal owner_id'ye özeldi).
--
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_own" ON public.workspace_members;

CREATE POLICY "workspace_members_select_all_in_workspace"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );
