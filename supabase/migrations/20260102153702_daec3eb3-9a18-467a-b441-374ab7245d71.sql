-- Create storage bucket for custom institution logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('institution-logos', 'institution-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload institution logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'institution-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to logos
CREATE POLICY "Anyone can view institution logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'institution-logos');

-- Allow users to update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'institution-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'institution-logos' AND auth.uid()::text = (storage.foldername(name))[1]);