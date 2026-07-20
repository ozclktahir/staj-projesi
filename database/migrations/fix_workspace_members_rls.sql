-- =============================================================================
-- workspace_members + workspaces RLS (owner bootstrap)
-- Tarih: 20 Temmuz 2026
-- Amaç: Yeni workspace oluşturulurken sahibin kendini workspace_members'a
--       Admin olarak ekleyebilmesi (RLS INSERT ihlalini giderir).
--
-- Supabase Dashboard → SQL Editor → bu dosyanın tamamını çalıştırın.
-- =============================================================================

-- 0) Gerekli sütun / indeks (yoksa)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_workspace_user
  ON public.workspace_members (workspace_id, user_id);

-- 1) RLS açık
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 2) Eski çakışan politikaları temizle (isimler projeden projeye değişebilir)
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_own" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_own" ON public.workspace_members;

DROP POLICY IF EXISTS "Users can create own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view own or member workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;

-- 3) workspaces politikaları
CREATE POLICY "Users can create own workspaces"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view own or member workspaces"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspaces"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 4) workspace_members — kritik INSERT politikası
--    Kullanıcı yalnızca KENDİ user_id'si ile satır ekleyebilir (auth.uid() eşleşmesi).
CREATE POLICY "Users can insert themselves as workspace members"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Okuma: kendi üyelik kayıtları
CREATE POLICY "Users can view own memberships"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Workspace sahibi, kendi workspace'indeki üyeleri görebilir / yönetebilir
CREATE POLICY "Workspace owners can manage members"
  ON public.workspace_members
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
  );

-- 5) (Önerilen) Workspace oluşunca sahibi otomatik Admin üye yap
--    SECURITY DEFINER → RLS'yi bypass eder; chicken-egg sorununu kökten çözer.
CREATE OR REPLACE FUNCTION public.handle_new_workspace_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'Admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created_add_owner ON public.workspaces;
CREATE TRIGGER on_workspace_created_add_owner
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace_owner_membership();

-- Not: Bazı Postgres sürümlerinde EXECUTE PROCEDURE gerekir; hata alırsanız:
--   EXECUTE PROCEDURE public.handle_new_workspace_owner_membership();
