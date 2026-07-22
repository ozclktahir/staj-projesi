-- Migration: fix_profiles_select_and_placeholders
-- Supabase SQL Editor'de çalıştırın.
-- 1) Eksik ad sütunları
-- 2) Placeholder full_name temizliği
-- 3) RLS: authenticated her profili okuyabilsin; kendi satırını yazabilsin

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Eski UI fallback'lerinin DB'ye yazıldığı satırları düzelt
UPDATE public.profiles
SET full_name = NULLIF(SPLIT_PART(COALESCE(email, ''), '@', 1), '')
WHERE full_name IS NULL
   OR TRIM(full_name) = ''
   OR LOWER(TRIM(full_name)) IN (
     'kullanıcı yükleniyor...',
     'kullanıcı yükleniyor',
     'kullanıcı',
     'hesap',
     'user',
     'loading'
   );

-- full_name hâlâ boşsa e-posta local
UPDATE public.profiles
SET full_name = NULLIF(SPLIT_PART(email, '@', 1), '')
WHERE (full_name IS NULL OR TRIM(full_name) = '')
  AND email IS NOT NULL
  AND TRIM(email) <> '';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
