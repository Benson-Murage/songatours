
-- ============ Payment Proofs System ============

-- Enums
DO $$ BEGIN
  CREATE TYPE public.payment_method_enum AS ENUM ('mpesa','bank_transfer','cash','card','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_proof_status AS ENUM ('pending_review','approved','rejected','more_info_requested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Additive column on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS overpayment_credit integer NOT NULL DEFAULT 0;

-- Extend sync trigger function to also set overpayment_credit
CREATE OR REPLACE FUNCTION public.sync_booking_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.balance_due := GREATEST(0, COALESCE(NEW.total_price, 0) - COALESCE(NEW.amount_paid, 0));
  NEW.overpayment_amount := GREATEST(0, COALESCE(NEW.amount_paid, 0) - COALESCE(NEW.total_price, 0));
  NEW.overpayment_credit := NEW.overpayment_amount;
  NEW.deposit_amount := COALESCE(NEW.amount_paid, 0);

  IF NEW.amount_paid IS NULL OR NEW.amount_paid <= 0 THEN
    NEW.payment_status := 'pending';
  ELSIF NEW.amount_paid < NEW.total_price THEN
    NEW.payment_status := 'partial';
  ELSIF NEW.amount_paid = NEW.total_price THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'overpaid';
  END IF;

  RETURN NEW;
END;
$function$;

-- Payment proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  payment_method public.payment_method_enum NOT NULL,
  amount_sent integer NOT NULL CHECK (amount_sent > 0),
  payment_date date NOT NULL,
  mpesa_code text,
  bank_reference text,
  notes text,
  status public.payment_proof_status NOT NULL DEFAULT 'pending_review',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_proofs_booking_idx ON public.payment_proofs(booking_id);
CREATE INDEX IF NOT EXISTS payment_proofs_user_idx ON public.payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS payment_proofs_status_idx ON public.payment_proofs(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO service_role;

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Users manage their own pending proofs
CREATE POLICY "Users view own proofs" ON public.payment_proofs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own proofs" ON public.payment_proofs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending proofs" ON public.payment_proofs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending_review')
  WITH CHECK (auth.uid() = user_id AND status = 'pending_review');

CREATE POLICY "Users delete own pending proofs" ON public.payment_proofs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending_review');

CREATE POLICY "Admins manage all proofs" ON public.payment_proofs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payment_proofs_updated_at
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for payment-proofs bucket
-- Path convention: {user_id}/{booking_id}/{filename}
CREATE POLICY "Users upload own payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Users delete own payment proofs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins update payment proofs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));
