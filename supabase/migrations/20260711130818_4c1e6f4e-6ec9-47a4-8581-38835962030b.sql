
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='check_ins_booking_id_fkey') THEN
    ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='check_ins_participant_id_fkey') THEN
    ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_participant_id_fkey
      FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='check_ins_admin_id_fkey') THEN
    ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_admin_id_fkey
      FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_user_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_tour_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_tour_id_fkey
      FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='participants_booking_id_fkey') THEN
    ALTER TABLE public.participants ADD CONSTRAINT participants_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
END $$;
