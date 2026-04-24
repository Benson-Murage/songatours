-- Auto-mark fixed-date tours as completed when departure_date has passed.
-- Safe, idempotent: only flips 'published' tours whose departure_date is strictly in the past.
CREATE OR REPLACE FUNCTION public.auto_complete_past_tours()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.tours
     SET status = 'completed', updated_at = now()
   WHERE is_fixed_date = true
     AND departure_date IS NOT NULL
     AND departure_date < CURRENT_DATE
     AND status = 'published';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_complete_past_tours() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_complete_past_tours() TO authenticated, service_role;

-- One-time backfill on existing data
SELECT public.auto_complete_past_tours();