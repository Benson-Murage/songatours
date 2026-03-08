
-- Fix RLS policies: Change from RESTRICTIVE to PERMISSIVE for tables with multiple policies

-- BOOKINGS: Drop and recreate SELECT policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can cancel own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- REFERRALS: Drop and recreate SELECT policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Authenticated users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can view all referrals" ON public.referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Admins can update referrals" ON public.referrals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TOURS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Published tours are viewable by everyone" ON public.tours;
DROP POLICY IF EXISTS "Admins can insert tours" ON public.tours;
DROP POLICY IF EXISTS "Admins can update tours" ON public.tours;
DROP POLICY IF EXISTS "Admins can delete tours" ON public.tours;

CREATE POLICY "Published tours are viewable by everyone" ON public.tours FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert tours" ON public.tours FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tours" ON public.tours FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tours" ON public.tours FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TOUR_IMAGES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Tour images viewable by everyone" ON public.tour_images;
DROP POLICY IF EXISTS "Admins can insert tour images" ON public.tour_images;
DROP POLICY IF EXISTS "Admins can update tour images" ON public.tour_images;
DROP POLICY IF EXISTS "Admins can delete tour images" ON public.tour_images;

CREATE POLICY "Tour images viewable by everyone" ON public.tour_images FOR SELECT USING (true);
CREATE POLICY "Admins can insert tour images" ON public.tour_images FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tour images" ON public.tour_images FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tour images" ON public.tour_images FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- DESTINATIONS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Destinations are viewable by everyone" ON public.destinations;
DROP POLICY IF EXISTS "Admins can insert destinations" ON public.destinations;
DROP POLICY IF EXISTS "Admins can update destinations" ON public.destinations;
DROP POLICY IF EXISTS "Admins can delete destinations" ON public.destinations;

CREATE POLICY "Destinations are viewable by everyone" ON public.destinations FOR SELECT USING (true);
CREATE POLICY "Admins can insert destinations" ON public.destinations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update destinations" ON public.destinations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete destinations" ON public.destinations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- FAVORITES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;

CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REVIEWS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews after booking" ON public.reviews;

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews after booking" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM bookings WHERE bookings.user_id = auth.uid() AND bookings.tour_id = reviews.tour_id AND bookings.status IN ('paid', 'pending')
  )
);

-- DISCOUNT_CODES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can read active discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can insert discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can update discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can delete discount codes" ON public.discount_codes;

CREATE POLICY "Anyone can read active discount codes" ON public.discount_codes FOR SELECT USING (true);
CREATE POLICY "Admins can insert discount codes" ON public.discount_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update discount codes" ON public.discount_codes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete discount codes" ON public.discount_codes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RECREATE MISSING TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_generate_booking_reference ON public.bookings;
CREATE TRIGGER trg_generate_booking_reference BEFORE INSERT ON public.bookings FOR EACH ROW WHEN (NEW.booking_reference IS NULL) EXECUTE FUNCTION public.generate_booking_reference();

-- Add unique constraints for data integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_destination_name ON public.destinations (lower(name), lower(country));
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tour_slug ON public.tours (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_discount_code ON public.discount_codes (upper(code));
