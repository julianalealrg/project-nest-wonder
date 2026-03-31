
INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias', 'evidencias', true);

CREATE POLICY "Authenticated can upload evidencias" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidencias');

CREATE POLICY "Anyone can view evidencias" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidencias');
