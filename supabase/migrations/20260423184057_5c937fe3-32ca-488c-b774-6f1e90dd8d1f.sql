-- Enable full row data on changes for realtime
ALTER TABLE public.ordens_servico REPLICA IDENTITY FULL;
ALTER TABLE public.registros REPLICA IDENTITY FULL;
ALTER TABLE public.romaneios REPLICA IDENTITY FULL;
ALTER TABLE public.pecas REPLICA IDENTITY FULL;

-- Add tables to realtime publication (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ordens_servico;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registros;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.romaneios;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pecas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;