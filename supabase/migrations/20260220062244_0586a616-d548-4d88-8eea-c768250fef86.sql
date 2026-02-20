
-- =============================================
-- FIX: Recreate ALL RLS policies as PERMISSIVE
-- All existing policies are RESTRICTIVE which breaks multi-policy access
-- =============================================

-- BOOKINGS: Drop and recreate
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can cancel own bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'cancelled'::booking_status);
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- TOURS: Drop and recreate
DROP POLICY IF EXISTS "Published tours are viewable by everyone" ON public.tours;
DROP POLICY IF EXISTS "Admins can manage tours" ON public.tours;

CREATE POLICY "Published tours are viewable by everyone" ON public.tours FOR SELECT USING (status = 'published'::tour_status OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert tours" ON public.tours FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update tours" ON public.tours FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tours" ON public.tours FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- DESTINATIONS: Drop and recreate
DROP POLICY IF EXISTS "Destinations are viewable by everyone" ON public.destinations;
DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;

CREATE POLICY "Destinations are viewable by everyone" ON public.destinations FOR SELECT USING (true);
CREATE POLICY "Admins can insert destinations" ON public.destinations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update destinations" ON public.destinations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete destinations" ON public.destinations FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- REVIEWS: Drop and recreate
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews after booking" ON public.reviews;

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews after booking" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.user_id = auth.uid()
    AND bookings.tour_id = reviews.tour_id
    AND bookings.status = ANY (ARRAY['paid'::booking_status, 'pending'::booking_status])
  )
);

-- FAVORITES: Drop and recreate
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;

CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- PROFILES: Drop and recreate
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- USER_ROLES: Drop and recreate
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
