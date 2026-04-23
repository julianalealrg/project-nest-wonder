INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas', 'entregas', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Authenticated can upload entregas'
  ) THEN
    CREATE POLICY "Authenticated can upload entregas"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'entregas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Public can read entregas'
  ) THEN
    CREATE POLICY "Public can read entregas"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'entregas');
  END IF;
END $$;