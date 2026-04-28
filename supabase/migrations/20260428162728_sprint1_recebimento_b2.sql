-- Sprint 1 — Recebimento B2: ocorrências, fotos e bloqueio de avanço
-- Reaproveita tabela `registros` (ocorrência interna de fábrica = origem 'fabrica';
-- solicitação de reposição = origem 'solicitacao'). Adiciona vínculo a peça/romaneio,
-- quantidade afetada e fotos. Adiciona fotos por peça no romaneio e foto geral das
-- peças armazenadas no recebimento. Cria bucket público `ocorrencias-fotos`.

-- 1. Registros: vínculo a peça e romaneio, quantidade, fotos
ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS peca_id uuid REFERENCES public.pecas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS romaneio_id uuid REFERENCES public.romaneios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantidade_afetada integer,
  ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS idx_registros_peca_id ON public.registros(peca_id);
CREATE INDEX IF NOT EXISTS idx_registros_romaneio_id ON public.registros(romaneio_id);

-- 2. Romaneio_pecas: fotos por peça (evidência de faltante/avariada)
ALTER TABLE public.romaneio_pecas
  ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 3. Romaneios: foto das peças armazenadas no recebimento (item 5 do mapa)
ALTER TABLE public.romaneios
  ADD COLUMN IF NOT EXISTS foto_pecas_armazenadas_url text;

-- 4. Bucket público para upload de fotos de ocorrências e recebimento
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocorrencias-fotos', 'ocorrencias-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket: leitura pública (URLs assinadas dispensam, mas mantemos
-- leitura aberta para simplificar exibição); escrita autenticada
DROP POLICY IF EXISTS "ocorrencias_fotos_select" ON storage.objects;
CREATE POLICY "ocorrencias_fotos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ocorrencias-fotos');

DROP POLICY IF EXISTS "ocorrencias_fotos_insert" ON storage.objects;
CREATE POLICY "ocorrencias_fotos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ocorrencias-fotos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ocorrencias_fotos_update" ON storage.objects;
CREATE POLICY "ocorrencias_fotos_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ocorrencias-fotos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ocorrencias_fotos_delete" ON storage.objects;
CREATE POLICY "ocorrencias_fotos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ocorrencias-fotos' AND auth.role() = 'authenticated');
