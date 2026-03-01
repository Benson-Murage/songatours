
-- 1. Add phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Add missing columns to tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS excluded text[] DEFAULT '{}'::text[];
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS whatsapp_group_link text;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS max_total_slots integer NOT NULL DEFAULT 50;

-- Add unique constraint on slug (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS tours_slug_unique ON public.tours (slug) WHERE slug IS NOT NULL;

-- 3. Expand tour_status enum with canceled and completed
ALTER TYPE public.tour_status ADD VALUE IF NOT EXISTS 'canceled';
ALTER TYPE public.tour_status ADD VALUE IF NOT EXISTS 'completed';

-- 4. Add missing columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_requests text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id);

-- 5. Create tour_images table
CREATE TABLE IF NOT EXISTS public.tour_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_images ENABLE ROW LEVEL SECURITY;

-- tour_images RLS: everyone can view, admins can manage
CREATE POLICY "Tour images viewable by everyone"
  ON public.tour_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tour images"
  ON public.tour_images FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tour images"
  ON public.tour_images FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tour images"
  ON public.tour_images FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admins can cancel any booking (update policy for cancelled_by)
-- Already have "Admins can update bookings" policy so this is covered

-- 7. Generate slugs for existing tours that don't have one
UPDATE public.tours
SET slug = lower(regexp_replace(title, '[^a-z0-9]+', '-', 'gi')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;
