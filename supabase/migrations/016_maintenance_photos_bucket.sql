-- Maintenance request images: public URLs (getPublicUrl) + tenant uploads via app
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated upload maintenance photos" ON storage.objects;
CREATE POLICY "Authenticated upload maintenance photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maintenance-photos');
