-- Sprint 2 — Fotos nos gatilhos de transição
-- Conferência final B1 (foto cavalete), Saída B1 (foto carga + romaneio motorista),
-- Entrada na cabine (foto insumos + doc assinado pelo acabador).
-- Todos opcionais — não bloqueiam a operação, ficam como evidência.

ALTER TABLE public.romaneios
  ADD COLUMN IF NOT EXISTS foto_cavalete_url text,
  ADD COLUMN IF NOT EXISTS foto_carga_url text,
  ADD COLUMN IF NOT EXISTS foto_romaneio_motorista_url text;

ALTER TABLE public.pecas
  ADD COLUMN IF NOT EXISTS foto_insumos_url text,
  ADD COLUMN IF NOT EXISTS foto_acabador_assinado_url text;
