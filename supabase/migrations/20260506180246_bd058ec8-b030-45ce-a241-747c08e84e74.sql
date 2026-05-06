
-- 1. Drop duplicate triggers (keep the canonical ones)
DROP TRIGGER IF EXISTS trg_booking_reference ON public.bookings;
DROP TRIGGER IF EXISTS update_tours_updated_at ON public.tours;

-- 2. Backfill missing booking references for legacy rows
DO $$
DECLARE
  rec RECORD;
  seq_num integer;
  ref_year text;
BEGIN
  FOR rec IN
    SELECT id, created_at FROM public.bookings
    WHERE booking_reference IS NULL
    ORDER BY created_at ASC
  LOOP
    ref_year := to_char(rec.created_at, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(booking_reference, '^SGT-' || ref_year || '-', ''), '')::int
    ), 0) + 1
      INTO seq_num
      FROM public.bookings
     WHERE booking_reference LIKE 'SGT-' || ref_year || '-%';

    UPDATE public.bookings
       SET booking_reference = 'SGT-' || ref_year || '-' || lpad(seq_num::text, 5, '0')
     WHERE id = rec.id;
  END LOOP;
END $$;
