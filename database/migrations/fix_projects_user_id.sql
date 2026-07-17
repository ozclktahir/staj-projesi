-- Migration: projects user_id şema düzeltmesi
-- Supabase SQL Editor'de çalıştırın.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- İsteğe bağlı: created_by dolu kayıtları user_id'ye taşı
-- UPDATE projects SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
