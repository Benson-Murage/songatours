
-- Fix overly permissive RLS: tighten participants INSERT/UPDATE/DELETE to authenticated role
ALTER POLICY "Users can insert own booking participants" ON public.participants TO authenticated;
ALTER POLICY "Admins can update participants" ON public.participants TO authenticated;
ALTER POLICY "Admins can delete participants" ON public.participants TO authenticated;

-- Tighten participants SELECT policies to authenticated
ALTER POLICY "Users can view own booking participants" ON public.participants TO authenticated;
ALTER POLICY "Admins can view all participants" ON public.participants TO authenticated;
