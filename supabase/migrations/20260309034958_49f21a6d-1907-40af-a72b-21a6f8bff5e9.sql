
-- Add photo_url column to nurses
ALTER TABLE public.nurses ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for nurse photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('nurse-photos', 'nurse-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
CREATE POLICY "Nurses can upload own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'nurse-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own photos
CREATE POLICY "Nurses can update own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'nurse-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view nurse photos (public bucket)
CREATE POLICY "Anyone can view nurse photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'nurse-photos');

-- Allow nurses to delete own photos
CREATE POLICY "Nurses can delete own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'nurse-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
