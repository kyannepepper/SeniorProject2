-- Storage policies for maintenance-photos bucket
-- Run this in Supabase SQL Editor after creating the bucket.

-- Allow authenticated users to upload to maintenance-photos
CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

-- Allow public read (for getPublicUrl to work)
CREATE POLICY "Public read for maintenance photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'maintenance-photos');
