
-- Add category column to tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'safari';

-- Create storage bucket for tour images
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-images', 'tour-images', true) ON CONFLICT DO NOTHING;

-- Storage RLS: anyone can view
CREATE POLICY "Public read tour images" ON storage.objects FOR SELECT USING (bucket_id = 'tour-images');

-- Storage RLS: admins can upload
CREATE POLICY "Admins can upload tour images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tour-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS: admins can delete
CREATE POLICY "Admins can delete tour images" ON storage.objects FOR DELETE USING (bucket_id = 'tour-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS: admins can update
CREATE POLICY "Admins can update tour images" ON storage.objects FOR UPDATE USING (bucket_id = 'tour-images' AND public.has_role(auth.uid(), 'admin'));
