-- Attach the booking reference trigger that was missing
CREATE TRIGGER trg_generate_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.booking_reference IS NULL)
  EXECUTE FUNCTION public.generate_booking_reference();