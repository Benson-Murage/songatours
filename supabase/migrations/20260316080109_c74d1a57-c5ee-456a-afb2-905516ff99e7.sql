
-- Restore critical triggers that are missing from the database

-- 1. Trigger: auto-create profile on auth signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger: auto-generate booking reference
CREATE OR REPLACE TRIGGER trg_generate_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.booking_reference IS NULL)
  EXECUTE FUNCTION public.generate_booking_reference();

-- 3. Trigger: auto-update updated_at on tours
CREATE OR REPLACE TRIGGER trg_tours_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
