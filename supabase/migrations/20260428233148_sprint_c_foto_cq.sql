-- Sprint C — Foto no CQ
-- Adiciona campo de foto opcional para evidência do controle de qualidade.
-- Reaproveita o bucket "ocorrencias-fotos" do Sprint 1.

ALTER TABLE public.pecas
  ADD COLUMN IF NOT EXISTS foto_cq_url text;
