
-- Restrict profiles: drop public select, add owner/admin policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public view exposing only non-sensitive profile fields (for reviews etc.)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow public read of safe columns through a security-definer function for joining
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, avatar_url FROM public.profiles WHERE id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;
