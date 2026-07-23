-- =============================================================================
-- notifications INSERT: workspace üyeleri birbirine bildirim yazabilsin
-- (görev atama bildirimleri için)
-- Dosya: fix_notifications_insert_members.sql
-- Tarih: 23 Temmuz 2026
-- Supabase SQL Editor'de çalıştırın.
-- =============================================================================

DROP POLICY IF EXISTS "notifications_insert_admin_or_self" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_workspace_members" ON public.notifications;

-- Auth kullanıcı:
--  1) kendine bildirim yazabilir
--  2) aynı workspace üyesi/owner ise başka üyeye bildirim yazabilir
CREATE POLICY "notifications_insert_workspace_members"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      workspace_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.workspaces w
          WHERE w.id = workspace_id AND w.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspace_id
            AND wm.user_id = auth.uid()
        )
        OR public.is_workspace_member(workspace_id)
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.workspaces w
          WHERE w.id = workspace_id AND w.owner_id = user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspace_id
            AND wm.user_id = notifications.user_id
        )
      )
    )
  );
