-- =============================================================================
-- Fix: "infinite recursion detected in policy for relation tasks"
-- Tarih: 15 Ağustos 2026
--
-- Sebep: add_task_assignees_multi.sql'de eklenen iki politika birbirini
-- çapraz sorguluyordu:
--   - tasks."tasks_select_assignee_or_admin" → task_assignees'e EXISTS ile bakıyor
--   - task_assignees."task_assignees_select" → tasks'a EXISTS ile bakıyor
-- Bu subquery'ler SECURITY DEFINER olmayan normal context'te planlandığı için
-- her ikisi de karşı tablonun RLS'ini tekrar tetikliyor → sonsuz döngü.
-- Görev oluşturma (`insert().select()`), RETURNING için SELECT politikasını
-- da değerlendirdiğinden hata task INSERT sırasında görünüyor.
--
-- Çözüm: is_workspace_admin/is_workspace_member'da zaten kullanılan pattern —
-- çapraz-tablo kontrollerini SECURITY DEFINER fonksiyonlara taşımak. Bu
-- fonksiyonlar tablo sahibi olarak çalıştığından RLS'i bypass eder, döngü
-- kırılır.
--
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

-- Geçerli kullanıcının bir görevin task_assignees'inde olup olmadığını
-- RLS'siz kontrol eder (tasks politikasından kullanılacak).
CREATE OR REPLACE FUNCTION public.is_task_assignee(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = p_task_id AND ta.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_task_assignee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid) TO authenticated;

-- Bir görevin geçerli kullanıcıya görünür olup olmadığını RLS'siz kontrol eder
-- (task_assignees politikasından kullanılacak) — tasks_select_assignee_or_admin
-- ile AYNI kural seti, tek fark task_assignees kontrolünün burada da inline
-- (RLS'siz) yapılması.
CREATE OR REPLACE FUNCTION public.can_view_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        t.created_by = auth.uid()
        OR t.assignee_id = auth.uid()
        OR t.assigned_to = auth.uid()
        OR public.is_workspace_admin(t.workspace_id)
        OR EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_task(uuid) TO authenticated;

-- tasks SELECT: task_assignees'e doğrudan EXISTS yerine SECURITY DEFINER fonksiyon.
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
    OR public.is_task_assignee(id)
  );

-- task_assignees SELECT: tasks'a doğrudan EXISTS yerine SECURITY DEFINER fonksiyon.
DROP POLICY IF EXISTS "task_assignees_select" ON public.task_assignees;
CREATE POLICY "task_assignees_select"
  ON public.task_assignees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_view_task(task_id)
  );
