
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  company jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  financial jsonb NOT NULL DEFAULT '{}'::jsonb,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  pwa jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
GRANT UPDATE, INSERT ON public.app_settings TO authenticated;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (id, company, branding, contact, financial, social, business_hours, legal, seo, pwa, notifications)
VALUES (
  true,
  jsonb_build_object(
    'name', 'Songa Travel & Tours',
    'tagline', 'Premium African travel experiences',
    'description', 'Discover breathtaking destinations and create unforgettable memories across Africa.',
    'address', 'Nairobi, Kenya',
    'registration_number', '',
    'tax_id', ''
  ),
  jsonb_build_object(
    'logo_url', '',
    'favicon_url', '',
    'primary_color', '#0F766E',
    'accent_color', '#F97316'
  ),
  jsonb_build_object(
    'support_email', 'salmajeods11@gmail.com',
    'sales_email', '',
    'phone_primary', '+254700000000',
    'phone_secondary', '',
    'whatsapp', '+254700000000',
    'address_lines', ARRAY['Nairobi, Kenya']
  ),
  jsonb_build_object(
    'currency', 'KES',
    'currency_symbol', 'KSh',
    'bank_name', '',
    'bank_account_name', 'Songa Travel & Tours',
    'bank_account_number', '',
    'bank_branch', '',
    'bank_swift', '',
    'mpesa_paybill', '',
    'mpesa_till', '',
    'mpesa_account_name', 'Songa Travel & Tours',
    'payment_instructions', 'Send payment via M-Pesa or bank transfer and upload proof in your booking.'
  ),
  jsonb_build_object(
    'instagram', '',
    'facebook', '',
    'twitter', '',
    'tiktok', '',
    'youtube', '',
    'linkedin', ''
  ),
  jsonb_build_object(
    'monday', '08:00-18:00',
    'tuesday', '08:00-18:00',
    'wednesday', '08:00-18:00',
    'thursday', '08:00-18:00',
    'friday', '08:00-18:00',
    'saturday', '09:00-15:00',
    'sunday', 'Closed'
  ),
  jsonb_build_object(
    'terms_url', '/terms',
    'privacy_url', '/privacy',
    'refund_url', '/refund-policy'
  ),
  jsonb_build_object(
    'default_title', 'Songa Travel & Tours',
    'default_description', 'Premium African travel experiences. Discover breathtaking destinations and create unforgettable memories.',
    'og_image', '',
    'keywords', ARRAY['safari','kenya tours','road trips','africa travel']
  ),
  jsonb_build_object(
    'app_name', 'Songa Travel',
    'short_name', 'Songa',
    'theme_color', '#0F766E',
    'background_color', '#ffffff'
  ),
  jsonb_build_object(
    'admin_email_alerts', true,
    'new_booking_alert', true,
    'payment_alert', true,
    'capacity_alert_threshold', 80,
    'low_seat_alert', true
  )
)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_check_ins_booking_id ON public.check_ins(booking_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_admin_id ON public.check_ins(admin_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON public.check_ins(created_at DESC);
