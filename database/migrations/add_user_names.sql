-- Migration: add_user_names
-- Supabase Dashboard → SQL Editor'de TÜM dosyayı çalıştırın.
-- Amaç: first_name / last_name sütunları + kayıtta otomatik profil oluşturma + RLS.

-- 1) Sütunlar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2) Auth kaydından profil oluşturan trigger (RLS'yi bypass eder: SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(
        TRIM(
          CONCAT_WS(
            ' ',
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name'
          )
        ),
        ''
      ),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN NULLIF(TRIM(EXCLUDED.full_name), '') IS NOT NULL THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    first_name = COALESCE(NULLIF(TRIM(EXCLUDED.first_name), ''), profiles.first_name),
    last_name = COALESCE(NULLIF(TRIM(EXCLUDED.last_name), ''), profiles.last_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) RLS politikaları (kullanıcı kendi profilini okuyup yazabilsin)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
