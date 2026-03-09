
-- Create participants table
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_number text NOT NULL,
  email text,
  nationality text,
  emergency_contact text,
  dietary_requirements text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants from their own bookings
CREATE POLICY "Users can view own booking participants"
  ON public.participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = participants.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

-- Admins can view all participants
CREATE POLICY "Admins can view all participants"
  ON public.participants FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert participants for their own bookings
CREATE POLICY "Users can insert own booking participants"
  ON public.participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = participants.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

-- Admins can manage participants
CREATE POLICY "Admins can update participants"
  ON public.participants FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete participants"
  ON public.participants FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
