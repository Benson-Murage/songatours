-- 1. Add new payment columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overpayment_amount numeric NOT NULL DEFAULT 0;

-- 2. Backfill: only trust deposit_amount as paid IF an admin audit log exists for that booking
UPDATE public.bookings b
SET amount_paid = COALESCE(b.deposit_amount, 0)
WHERE EXISTS (
  SELECT 1 FROM public.payment_audit_logs pal WHERE pal.booking_id = b.id
);

-- 3. For bookings WITHOUT an audit log, reset phantom payment data
UPDATE public.bookings b
SET amount_paid = 0,
    deposit_amount = 0,
    balance_due = b.total_price,
    payment_status = 'pending',
    payment_method = NULL,
    payment_reference = NULL,
    status = CASE WHEN b.status = 'paid' THEN 'pending'::booking_status ELSE b.status END
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_audit_logs pal WHERE pal.booking_id = b.id
);

-- 4. Recompute balance_due and overpayment_amount for everyone
UPDATE public.bookings
SET balance_due = GREATEST(0, total_price - amount_paid),
    overpayment_amount = GREATEST(0, amount_paid - total_price);

-- 5. Recompute payment_status from amount_paid (single source of truth)
UPDATE public.bookings
SET payment_status = CASE
  WHEN amount_paid <= 0 THEN 'pending'
  WHEN amount_paid < total_price THEN 'partial'
  WHEN amount_paid = total_price THEN 'paid'
  ELSE 'overpaid'
END;

-- 6. Trigger to keep balance_due, overpayment_amount, deposit_amount, payment_status consistent
CREATE OR REPLACE FUNCTION public.sync_booking_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Always derive these from amount_paid + total_price
  NEW.balance_due := GREATEST(0, COALESCE(NEW.total_price, 0) - COALESCE(NEW.amount_paid, 0));
  NEW.overpayment_amount := GREATEST(0, COALESCE(NEW.amount_paid, 0) - COALESCE(NEW.total_price, 0));
  -- Mirror amount_paid into deposit_amount for backwards compatibility with existing UI/queries
  NEW.deposit_amount := COALESCE(NEW.amount_paid, 0);

  -- Auto-derive payment_status if not explicitly being set to something special
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
$$;

DROP TRIGGER IF EXISTS bookings_sync_payment_fields ON public.bookings;
CREATE TRIGGER bookings_sync_payment_fields
BEFORE INSERT OR UPDATE OF amount_paid, total_price ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_payment_fields();