
-- Add itinerary to tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS itinerary jsonb DEFAULT '[]'::jsonb;

-- Add payment and booking reference fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_reference text UNIQUE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0;

-- Create a function to auto-generate booking reference
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_num integer;
  ref_year text;
BEGIN
  ref_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM public.bookings WHERE booking_reference IS NOT NULL;
  NEW.booking_reference := 'SGT-' || ref_year || '-' || lpad(seq_num::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger for auto booking reference
DROP TRIGGER IF EXISTS trg_booking_reference ON public.bookings;
CREATE TRIGGER trg_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.booking_reference IS NULL)
  EXECUTE FUNCTION public.generate_booking_reference();

-- Add deposit_percentage to tours for payment-ready architecture
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS deposit_percentage integer DEFAULT 30;
