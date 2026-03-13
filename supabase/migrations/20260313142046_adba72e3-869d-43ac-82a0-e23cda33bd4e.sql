
-- Payment audit logs table
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  old_amount_paid numeric,
  new_amount_paid numeric,
  old_payment_status text,
  new_payment_status text,
  old_payment_method text,
  new_payment_method text,
  change_reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment audit logs"
  ON public.payment_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert payment audit logs"
  ON public.payment_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
