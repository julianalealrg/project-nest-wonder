-- Sprint F1a: Cliente como entidade gerenciável
-- Adiciona campos estáveis úteis pra NF, contato e referência (arquiteta).

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cnpj_cpf text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS arquiteta text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger pra manter updated_at coerente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clientes_set_updated_at ON clientes;
CREATE TRIGGER clientes_set_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Índice pra busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_clientes_nome_lower ON clientes (lower(nome));
