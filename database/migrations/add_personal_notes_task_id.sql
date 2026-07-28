-- =============================================================================
-- personal_notes: opsiyonel task_id ilişkisi
-- Tarih: 28 Temmuz 2026
-- =============================================================================

ALTER TABLE public.personal_notes
  ADD COLUMN IF NOT EXISTS task_id UUID NULL REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_personal_notes_user_task
  ON public.personal_notes (user_id, task_id);
