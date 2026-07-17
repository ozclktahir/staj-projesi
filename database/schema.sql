-- =============================================================================
-- staj-projesi — Veritabanı Şema Değişiklikleri (Dokümantasyon)
-- =============================================================================
-- Bu dosya, Supabase üzerinde elle uygulanan / uygulanması gereken SQL
-- değişikliklerinin referans listesidir.
-- Amaç: Yeni bir geliştiricinin ortamı kurarken hangi ALTER / INDEX / RPC
-- adımlarını bilmesi gerektiğini göstermek.
--
-- NOT: Komutlar yorum satırı olarak bırakılmıştır. Supabase SQL Editor'de
-- ihtiyaca göre ilgili blokların yorumunu kaldırıp çalıştırın.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) TASKS — Ek sütunlar
-- -----------------------------------------------------------------------------
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID;
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_url TEXT;
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 2) PROJECTS — Soft delete
-- -----------------------------------------------------------------------------
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID;

-- -----------------------------------------------------------------------------
-- 3) WORKSPACE_INVITATIONS — Davet durumu
-- -----------------------------------------------------------------------------
-- ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
-- -- Beklenen değerler: PENDING | ACCEPTED

-- -----------------------------------------------------------------------------
-- 4) NOTIFICATIONS — Gerçek zamanlı bildirim tablosu
-- -----------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS notifications (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   workspace_id UUID NOT NULL REFERENCES workspaces(id),
--   user_id UUID NOT NULL,
--   type TEXT NOT NULL,
--   title TEXT NOT NULL,
--   message TEXT NOT NULL,
--   metadata JSONB,
--   is_read BOOLEAN NOT NULL DEFAULT FALSE,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- -----------------------------------------------------------------------------
-- 5) PERFORMANS İNDEKSLERİ
--    (Role Guard, listeleme, soft-delete ve bildirim sorguları için)
-- -----------------------------------------------------------------------------

-- Role Guard sıcak yolu: workspace üyeliği kontrolü
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_workspace_user
--   ON workspace_members (workspace_id, user_id);

-- Soft-delete'li görev listeleri
-- CREATE INDEX IF NOT EXISTS idx_tasks_workspace_deleted
--   ON tasks (workspace_id, deleted_at);

-- Görev filtreleri
-- CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status
--   ON tasks (workspace_id, status);
-- CREATE INDEX IF NOT EXISTS idx_tasks_assignee
--   ON tasks (assignee_id);
-- CREATE INDEX IF NOT EXISTS idx_tasks_parent
--   ON tasks (parent_task_id);
-- CREATE INDEX IF NOT EXISTS idx_tasks_project
--   ON tasks (project_id);

-- Soft-delete'li proje listeleri
-- CREATE INDEX IF NOT EXISTS idx_projects_workspace_deleted
--   ON projects (workspace_id, deleted_at);

-- Bildirim akışı
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_created
--   ON notifications (user_id, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user
--   ON notifications (workspace_id, user_id);

-- Aktivite günlüğü
-- CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created
--   ON activity_logs (workspace_id, created_at DESC);

-- Yorum ve dosya listeleri
-- CREATE INDEX IF NOT EXISTS idx_comments_task_created
--   ON comments (task_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_files_task
--   ON files (task_id);

-- -----------------------------------------------------------------------------
-- 6) RPC — İstatistiksel dashboard
-- -----------------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION get_workspace_statistics(p_workspace_id UUID)
-- RETURNS JSON
-- LANGUAGE sql
-- AS $$
--   -- Tamamlanan / geciken görev sayıları vb. (Supabase tarafında tanımlı)
--   SELECT json_build_object(
--     'workspace_id', p_workspace_id
--     -- ... proje özel istatistik alanları
--   );
-- $$;

-- -----------------------------------------------------------------------------
-- 7) STORAGE
-- -----------------------------------------------------------------------------
-- Bucket adı: uploads
-- Object path örneği: {workspaceId}/{taskId}/{timestamp}-{filename}

-- -----------------------------------------------------------------------------
-- 8) PROFILES — Kayıt sırasında Ad / Soyad alanları
--    Mevcut sütunlar: id, email, full_name, avatar_url
--    Migration: database/migrations/add_user_names.sql
--    (sütunlar + handle_new_user trigger + RLS politikaları)
-- -----------------------------------------------------------------------------
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
