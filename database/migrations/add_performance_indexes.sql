-- =============================================================================
-- Performans indeksleri (B-Tree) — sorgu latency düşürme
-- Tarih: 28 Temmuz 2026
-- Uygulama: Supabase SQL Editor'de çalıştırın.
-- =============================================================================

-- tasks: proje / atanan / durum / soft-delete / üst-görev filtreleri
CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON public.tasks (project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id
  ON public.tasks (assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON public.tasks (status);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id
  ON public.tasks (workspace_id);

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks (parent_task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON public.tasks (due_date)
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_created
  ON public.tasks (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_created
  ON public.tasks (assignee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_deleted
  ON public.tasks (workspace_id, deleted_at);

-- personal_notes (projede "notes" yerine bu tablo kullanılıyor)
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_id
  ON public.personal_notes (user_id);

CREATE INDEX IF NOT EXISTS idx_personal_notes_task_id
  ON public.personal_notes (task_id)
  WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personal_notes_user_updated
  ON public.personal_notes (user_id, updated_at DESC);

-- personal_todos
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_due
  ON public.personal_todos (user_id, due_date);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user
  ON public.notifications (workspace_id, user_id);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created
  ON public.activity_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created
  ON public.activity_logs (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_task_created
  ON public.activity_logs (task_id, created_at DESC);

-- projects listeleri
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id
  ON public.projects (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members (user_id);
