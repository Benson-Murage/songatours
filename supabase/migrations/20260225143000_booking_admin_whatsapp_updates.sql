-- Booking and tour communication/admin enhancements
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT,
  ADD COLUMN IF NOT EXISTS max_total_slots INTEGER NOT NULL DEFAULT 250;

-- Basic validation for WhatsApp invite links when provided.
ALTER TABLE public.tours
  ADD CONSTRAINT tours_whatsapp_group_link_check
  CHECK (
    whatsapp_group_link IS NULL
    OR whatsapp_group_link ~* '^https?://'
  );

ALTER TABLE public.tours
  ADD CONSTRAINT tours_max_total_slots_check
  CHECK (max_total_slots > 0);
