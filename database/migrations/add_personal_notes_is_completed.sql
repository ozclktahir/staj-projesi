-- =============================================================================
-- personal_notes: is_completed (tamamlama) alanı
-- Tarih: 28 Temmuz 2026
-- =============================================================================

ALTER TABLE public.personal_notes
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_personal_notes_user_completed
  ON public.personal_notes (user_id, is_completed);
