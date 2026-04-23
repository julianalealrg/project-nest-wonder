UPDATE ordens_servico os
SET status = 'enviado_base2',
    localizacao = 'Em trânsito',
    updated_at = now()
WHERE status = 'acabamento'
  AND EXISTS (
    SELECT 1 FROM romaneio_pecas rp
    JOIN romaneios r ON r.id = rp.romaneio_id
    WHERE rp.os_id = os.id
      AND r.tipo_rota = 'base1_base2'
      AND r.status NOT IN ('entregue', 'recebido')
  );