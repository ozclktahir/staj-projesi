-- =============================================================================
-- projects tablosu RLS INSERT (şema uyumlu)
-- Tarih: 20 Temmuz 2026
--
-- Şema (kod tabanından):
--   projects.workspace_id  → workspaces FK (zorunlu ilişki)
--   projects.created_by    → oluşturan kullanıcı (Nest + Server Action standart alanı)
--   projects.user_id       → opsiyonel (migration ile eklenebilir)
--   projects.owner_id      → opsiyonel (bazı ortamlarda yok)
--
-- Supabase Dashboard → SQL Editor → tamamını Run edin.
-- =============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Opsiyonel kolonlar (yoksa ekle; RLS/payload uyumu için)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Üyelik kontrolü: nested RLS'ye takılmamak için SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_workspace_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = p_workspace_id
          AND w.owner_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;

-- Eski / çakışan politikaları temizle
DROP POLICY IF EXISTS "projects_insert_by_creator_and_member" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_created_by" ON public.projects;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;

-- INSERT: created_by = auth.uid() VE workspace üyesi/sahibi
CREATE POLICY "projects_insert_by_creator_and_member"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND public.is_workspace_member(workspace_id)
  );

-- SELECT: oluşturan veya workspace üyesi
CREATE POLICY "projects_select_member"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_workspace_member(workspace_id)
  );

-- UPDATE: oluşturan
CREATE POLICY "projects_update_own"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
