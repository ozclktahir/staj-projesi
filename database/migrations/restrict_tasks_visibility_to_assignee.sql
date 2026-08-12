-- =============================================================================
-- Görev görünürlüğü: OWNER/Admin tüm görevleri, Member/Guest yalnızca kendine
-- atanmış (veya kendi oluşturduğu) görevleri görsün.
-- Tarih: 12 Ağustos 2026
--
-- Önceki durum: tasks_select_member_or_assignee politikası
-- `is_workspace_member(workspace_id)` kullanıyordu — bu, workspace'teki HERKESE
-- (Member/Guest dahil) TÜM görevleri okuma izni veriyordu; uygulama katmanı
-- (getProjectTasks) Member için filtre uygulasa da, Supabase Realtime
-- postgres_changes bu RLS'e göre çalıştığından Member'lar başkalarının
-- görevlerindeki realtime güncellemeleri de görebiliyordu (gizlilik sızıntısı).
--
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

-- is_workspace_admin: OWNER veya Admin rolündeki kullanıcılar için true.
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
        SELECT 1 FROM public.workspaces w
        WHERE w.id = p_workspace_id AND w.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = auth.uid()
          AND upper(wm.role) IN ('ADMIN', 'OWNER')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;

-- Tasks SELECT: creator / assignee / workspace admin (yalnızca admin tüm
-- görevleri görür; Member/Guest sadece kendi görevlerini).
DROP POLICY IF EXISTS "tasks_select_member_or_assignee" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "tasks_select_assignee_or_admin"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_workspace_admin(workspace_id)
  );
