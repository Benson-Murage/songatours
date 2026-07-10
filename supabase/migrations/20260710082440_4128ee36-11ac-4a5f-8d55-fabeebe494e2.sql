
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID,
  ADD COLUMN IF NOT EXISTS national_id TEXT;

CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw TEXT;
  code TEXT := '';
  i INT;
  b INT;
BEGIN
  raw := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  FOR i IN 1..7 LOOP
    b := ('x' || substr(raw, (i-1)*2 + 1, 2))::bit(8)::int % 32;
    code := code || substr(alphabet, b + 1, 1);
  END LOOP;
  RETURN 'SGT-' || to_char(now(), 'YYYY') || '-' || code;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_booking_verification_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE candidate TEXT; tries INT := 0;
BEGIN
  IF NEW.verification_code IS NOT NULL THEN RETURN NEW; END IF;
  LOOP
    candidate := public.generate_verification_code();
    tries := tries + 1;
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.bookings WHERE verification_code = candidate) OR tries > 8;
  END LOOP;
  NEW.verification_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_verification_code ON public.bookings;
CREATE TRIGGER trg_bookings_verification_code
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.assign_booking_verification_code();

UPDATE public.bookings SET verification_code = public.generate_verification_code() WHERE verification_code IS NULL;

CREATE OR REPLACE FUNCTION public.assign_receipt_number_if_paid()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num INT;
BEGIN
  IF NEW.receipt_number IS NULL
     AND NEW.payment_status IN ('paid','overpaid')
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    SELECT COUNT(*) + 1 INTO seq_num FROM public.bookings WHERE receipt_number IS NOT NULL;
    NEW.receipt_number := 'RCPT-' || to_char(now(),'YYYY') || '-' || lpad(seq_num::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_receipt_number ON public.bookings;
CREATE TRIGGER trg_bookings_receipt_number
BEFORE INSERT OR UPDATE OF payment_status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.assign_receipt_number_if_paid();

CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  admin_id UUID NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device TEXT, gps TEXT, notes TEXT,
  action TEXT NOT NULL DEFAULT 'check_in',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_check_ins_booking ON public.check_ins(booking_id);
GRANT SELECT, INSERT ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own booking check-ins" ON public.check_ins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = check_ins.booking_id AND b.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert check-ins" ON public.check_ins FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND admin_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  code_tried TEXT, ip TEXT, user_agent TEXT, admin_id UUID,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created ON public.verification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_logs_ip ON public.verification_logs(ip, created_at DESC);
GRANT SELECT ON public.verification_logs TO authenticated;
GRANT ALL ON public.verification_logs TO service_role;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view verification logs" ON public.verification_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.receipt_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipt_downloads_booking ON public.receipt_downloads(booking_id);
GRANT SELECT, INSERT ON public.receipt_downloads TO authenticated;
GRANT ALL ON public.receipt_downloads TO service_role;
ALTER TABLE public.receipt_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own downloads" ON public.receipt_downloads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own downloads" ON public.receipt_downloads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE IF NOT EXISTS public.payment_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timeline_booking ON public.payment_timeline_events(booking_id, created_at);
GRANT SELECT, INSERT ON public.payment_timeline_events TO authenticated;
GRANT ALL ON public.payment_timeline_events TO service_role;
ALTER TABLE public.payment_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own timeline" ON public.payment_timeline_events FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert timeline for own booking" ON public.payment_timeline_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE OR REPLACE FUNCTION public.log_booking_timeline()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payment_timeline_events(booking_id, event_type, actor_id, payload)
    VALUES (NEW.id, 'booking_created', NEW.user_id, jsonb_build_object('total_price', NEW.total_price));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid THEN
      INSERT INTO public.payment_timeline_events(booking_id, event_type, actor_id, payload)
      VALUES (NEW.id, 'payment_updated', auth.uid(), jsonb_build_object('old', OLD.amount_paid, 'new', NEW.amount_paid, 'status', NEW.payment_status));
    END IF;
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status IN ('paid','overpaid') AND (OLD.payment_status IS NULL OR OLD.payment_status NOT IN ('paid','overpaid')) THEN
      INSERT INTO public.payment_timeline_events(booking_id, event_type, actor_id, payload)
      VALUES (NEW.id, 'payment_completed', auth.uid(), jsonb_build_object('receipt_number', NEW.receipt_number));
    END IF;
    IF NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at AND NEW.checked_in_at IS NOT NULL THEN
      INSERT INTO public.payment_timeline_events(booking_id, event_type, actor_id, payload)
      VALUES (NEW.id, 'checked_in', NEW.checked_in_by, jsonb_build_object('at', NEW.checked_in_at));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_booking_timeline ON public.bookings;
CREATE TRIGGER trg_booking_timeline AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_timeline();

CREATE OR REPLACE FUNCTION public.log_proof_timeline()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payment_timeline_events(booking_id, event_type, actor_id, payload)
    VALUES (NEW.booking_id, 'proof_uploaded', NEW.user_id, jsonb_build_object('amount_sent', NEW.amount_sent, 'method', NEW.payment_method));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.payment_timeline_events(booking_id, event_type, actor_id, payload)
    VALUES (NEW.booking_id, 'proof_' || NEW.status::text, NEW.reviewed_by, jsonb_build_object('reason', NEW.review_reason));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_proof_timeline ON public.payment_proofs;
CREATE TRIGGER trg_proof_timeline AFTER INSERT OR UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.log_proof_timeline();

CREATE TABLE IF NOT EXISTS public.receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0F766E',
  accent_color TEXT DEFAULT '#F97316',
  font_family TEXT DEFAULT 'Inter',
  header_text TEXT DEFAULT 'Songa Tours',
  footer_text TEXT DEFAULT 'Thank you for choosing Songa Tours.',
  bank_details TEXT DEFAULT '',
  payment_instructions TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  contact_details TEXT DEFAULT '',
  signature_url TEXT,
  signature_name TEXT DEFAULT 'Authorized Signatory',
  stamp_url TEXT,
  show_signature BOOLEAN NOT NULL DEFAULT true,
  show_stamp BOOLEAN NOT NULL DEFAULT true,
  sections JSONB NOT NULL DEFAULT '["header","customer","tour","payment","balance","terms","footer"]'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.receipt_settings TO anon, authenticated;
GRANT ALL ON public.receipt_settings TO service_role;
GRANT UPDATE, INSERT ON public.receipt_settings TO authenticated;
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads receipt settings" ON public.receipt_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage receipt settings" ON public.receipt_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_receipt_settings_updated ON public.receipt_settings;
CREATE TRIGGER trg_receipt_settings_updated BEFORE UPDATE ON public.receipt_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.receipt_settings(header_text) SELECT 'Songa Tours'
WHERE NOT EXISTS(SELECT 1 FROM public.receipt_settings);
