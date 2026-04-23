-- Colunas em ordens_servico
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS foto_entrega_url text,
  ADD COLUMN IF NOT EXISTS entregue_sem_foto_justificativa text,
  ADD COLUMN IF NOT EXISTS entregue_bypass_por text,
  ADD COLUMN IF NOT EXISTS entregue_confirmado_por text,
  ADD COLUMN IF NOT EXISTS entregue_confirmado_em timestamptz,
  ADD COLUMN IF NOT EXISTS registro_origem_id uuid REFERENCES public.registros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS material_disponivel boolean,
  ADD COLUMN IF NOT EXISTS material_solicitado_cd boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS terceiro_nome text;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_registro_origem
  ON public.ordens_servico(registro_origem_id);

-- Conferência dupla nos romaneios
ALTER TABLE public.romaneios
  ADD COLUMN IF NOT EXISTS conferido_saida_por text,
  ADD COLUMN IF NOT EXISTS conferido_saida_em timestamptz,
  ADD COLUMN IF NOT EXISTS conferido_entrada_por text,
  ADD COLUMN IF NOT EXISTS conferido_entrada_em timestamptz,
  ADD COLUMN IF NOT EXISTS foto_romaneio_assinado_url text;

-- Ação produtiva no registro
ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS acao_produtiva text,
  ADD COLUMN IF NOT EXISTS material_disponivel boolean,
  ADD COLUMN IF NOT EXISTS os_gerada_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL;