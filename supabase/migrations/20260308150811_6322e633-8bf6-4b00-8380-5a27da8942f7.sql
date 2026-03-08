
-- Discount codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer DEFAULT NULL,
  times_used integer NOT NULL DEFAULT 0,
  applicable_tour_id uuid REFERENCES public.tours(id) ON DELETE SET NULL DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can validate codes (read), only admins manage
CREATE POLICY "Anyone can read active discount codes" ON public.discount_codes
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert discount codes" ON public.discount_codes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update discount codes" ON public.discount_codes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete discount codes" ON public.discount_codes
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Referral codes table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referral_code text NOT NULL UNIQUE,
  referred_email text DEFAULT NULL,
  referred_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL DEFAULT NULL,
  reward_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can update referrals" ON public.referrals
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Add discount_code and referral_code to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_code text DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_code text DEFAULT NULL;

-- Add nationality and emergency_contact to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact text DEFAULT NULL;
