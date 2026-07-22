-- =============================================================================
-- Notifications + Workspace Invitations (Realtime destekli)
-- Dosya: add_notifications_and_invites.sql
-- Tarih: 22 Temmuz 2026
-- Supabase SQL Editor'de tamamını çalıştırın.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eksik kolonlar (eski şemalar için)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- user_id → profiles (yoksa auth.users)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.notifications
        DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      ALTER TABLE public.notifications
        DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END;
  ELSE
    ALTER TABLE public.notifications
      DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_admin_or_self" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin / owner workspace üyelerine bildirim yazabilir; kullanıcı kendine de yazabilir
CREATE POLICY "notifications_insert_admin_or_self"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = notifications.workspace_id
        AND wm.user_id = auth.uid()
        AND upper(wm.role) IN ('ADMIN', 'OWNER')
    )
  );

-- -----------------------------------------------------------------------------
-- 2) workspace_invitations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT,
  invited_user_id UUID,
  invited_by UUID,
  role TEXT NOT NULL DEFAULT 'Member',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS invited_user_id UUID;
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS invited_by UUID;
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Member';
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.workspace_invitations
        DROP CONSTRAINT IF EXISTS workspace_invitations_invited_by_fkey;
      ALTER TABLE public.workspace_invitations
        ADD CONSTRAINT workspace_invitations_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      NULL;
    END;
    BEGIN
      ALTER TABLE public.workspace_invitations
        DROP CONSTRAINT IF EXISTS workspace_invitations_invited_user_id_fkey;
      ALTER TABLE public.workspace_invitations
        ADD CONSTRAINT workspace_invitations_invited_user_id_fkey
        FOREIGN KEY (invited_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email_status
  ON public.workspace_invitations (lower(email), status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace
  ON public.workspace_invitations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_user_status
  ON public.workspace_invitations (invited_user_id, status);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select_own_email_or_admin" ON public.workspace_invitations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON public.workspace_invitations;
DROP POLICY IF EXISTS "invitations_update_own_or_admin" ON public.workspace_invitations;

CREATE POLICY "invitations_select_own_email_or_admin"
  ON public.workspace_invitations FOR SELECT TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR lower(COALESCE(email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND upper(wm.role) IN ('ADMIN', 'OWNER')
    )
  );

CREATE POLICY "invitations_insert_admin"
  ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND (
      workspace_id IN (
        SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
      )
      OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND upper(wm.role) IN ('ADMIN', 'OWNER')
      )
    )
  );

CREATE POLICY "invitations_update_own_or_admin"
  ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR lower(COALESCE(email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND upper(wm.role) IN ('ADMIN', 'OWNER')
    )
  )
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3) Realtime: notifications yayınla
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN
      RAISE NOTICE 'supabase_realtime publication yok — Dashboard > Replication üzerinden ekleyin.';
    WHEN others THEN
      RAISE NOTICE 'Realtime publication: %', SQLERRM;
  END;
END $$;

-- Replica identity FULL (filtreli realtime için önerilir)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
