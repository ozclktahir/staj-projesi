-- =============================================================================
-- Görev onay iş akışları: assignment_status + deletion_status
-- Tarih: 27 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deletion_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignment_pending_at TIMESTAMPTZ NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deletion_requested_by UUID NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ NULL;

-- Mevcut görevler: zaten atanmış / eski kayıtlar kabul edilmiş sayılsın
UPDATE public.tasks
SET assignment_status = 'accepted'
WHERE assignment_status = 'pending'
  AND deleted_at IS NULL
  AND (
    assignee_id IS NULL
    OR created_at < now() - interval '1 minute'
  );

-- Constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignment_status_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_assignment_status_check
      CHECK (assignment_status IN ('pending', 'accepted', 'rejected'));
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'assignment_status check atlandı: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_deletion_status_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_deletion_status_check
      CHECK (deletion_status IN ('none', 'pending_admin_approval', 'pending_user_approval'));
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'deletion_status check atlandı: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_assignment_pending
  ON public.tasks (workspace_id, assignment_status, assignment_pending_at)
  WHERE assignment_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tasks_deletion_pending
  ON public.tasks (workspace_id, deletion_status)
  WHERE deletion_status <> 'none';
