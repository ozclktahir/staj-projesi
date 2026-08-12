-- =============================================================================
-- Çoklu görev ataması (multi-assignee): task_assignees join tablosu.
-- Tarih: 12 Ağustos 2026
--
-- Tasarım notu: Mevcut tekli `tasks.assignee_id`/`assigned_to` alanı, görev
-- sahiplenme (claim/accept/reject), dual-approval silme ve bildirim akışlarının
-- "birincil" hedefi olarak DEĞİŞMEDEN kalır (bu akışları yeniden tasarlamak
-- ayrı ve büyük bir iş). `task_assignees`, bunun ÜZERİNE eklenen, görevi
-- BİRDEN FAZLA kişiye görünür/ilişkili kılan ek bir katmandır (ör. "ayrıca
-- şunlar da ilgileniyor/atanmış"). Mevcut tekli atama otomatik olarak
-- task_assignees'e de yazılır (bkz. backfill + updateTask senkronu).
--
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id
  ON public.task_assignees (user_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace admin'i veya görevin kendisini görebilen herkes (creator/
-- assignee/admin — tasks_select_assignee_or_admin ile aynı mantık) okuyabilir.
DROP POLICY IF EXISTS "task_assignees_select" ON public.task_assignees;
CREATE POLICY "task_assignees_select"
  ON public.task_assignees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND (
          t.created_by = auth.uid()
          OR t.assignee_id = auth.uid()
          OR t.assigned_to = auth.uid()
          OR public.is_workspace_admin(t.workspace_id)
        )
    )
  );

-- INSERT/DELETE: yalnızca görevin workspace admin'i (atama yönetimi admin işi).
DROP POLICY IF EXISTS "task_assignees_insert_admin" ON public.task_assignees;
CREATE POLICY "task_assignees_insert_admin"
  ON public.task_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_workspace_admin(t.workspace_id)
    )
  );

DROP POLICY IF EXISTS "task_assignees_delete_admin" ON public.task_assignees;
CREATE POLICY "task_assignees_delete_admin"
  ON public.task_assignees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_workspace_admin(t.workspace_id)
    )
  );

-- Backfill: mevcut tekli atamaları task_assignees'e taşı.
INSERT INTO public.task_assignees (task_id, user_id)
SELECT t.id, COALESCE(t.assignee_id, t.assigned_to)
FROM public.tasks t
WHERE COALESCE(t.assignee_id, t.assigned_to) IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Görev görünürlüğü (item 6 ile eklenen tasks_select_assignee_or_admin
-- politikasını) task_assignees üyelerini de kapsayacak şekilde genişlet.
DROP POLICY IF EXISTS "tasks_select_assignee_or_admin" ON public.tasks;
CREATE POLICY "tasks_select_assignee_or_admin"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_workspace_admin(workspace_id)
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = id AND ta.user_id = auth.uid()
    )
  );
