-- =============================================================================
-- Global Realtime — tasks, comments, attachments, activity_logs, invitations
-- Dosya: enable_global_realtime.sql
-- Tarih: 23 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın (Dashboard > Replication ile de eklenebilir).
-- =============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks',
    'task_comments',
    'comments',
    'task_attachments',
    'activity_logs',
    'workspace_invitations',
    'notifications'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      BEGIN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          t
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_object THEN
          RAISE NOTICE 'supabase_realtime publication yok — % atlandı', t;
        WHEN others THEN
          RAISE NOTICE 'Realtime %: %', t, SQLERRM;
      END;

      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I REPLICA IDENTITY FULL',
          t
        );
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'REPLICA IDENTITY %: %', t, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;
