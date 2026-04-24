-- 1. Add manual override flag
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS area_m2_manual boolean NOT NULL DEFAULT false;

-- 2. Function to recalculate area based on pecas (only when not manual)
CREATE OR REPLACE FUNCTION public.recalcular_area_os(p_os_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ordens_servico
  SET area_m2 = COALESCE((
    SELECT SUM(COALESCE(comprimento, 0) * COALESCE(largura, 0) * COALESCE(quantidade, 1))
    FROM public.pecas
    WHERE os_id = p_os_id
  ), 0)
  WHERE id = p_os_id
    AND area_m2_manual = false;
END;
$$;

-- 3. Trigger function on pecas: recalculate the affected OS area after any change
CREATE OR REPLACE FUNCTION public.trg_recalcular_area_os_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalcular_area_os(OLD.os_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalcular_area_os(NEW.os_id);
    -- If updating and the os_id changed, recalculate the previous OS too
    IF (TG_OP = 'UPDATE' AND OLD.os_id IS DISTINCT FROM NEW.os_id) THEN
      PERFORM public.recalcular_area_os(OLD.os_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_area_os ON public.pecas;
CREATE TRIGGER trg_recalcular_area_os
AFTER INSERT OR UPDATE OR DELETE ON public.pecas
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalcular_area_os_fn();

-- 4. Backfill: recalculate every OS that is not marked as manual
UPDATE public.ordens_servico
SET area_m2 = COALESCE((
  SELECT SUM(COALESCE(comprimento, 0) * COALESCE(largura, 0) * COALESCE(quantidade, 1))
  FROM public.pecas
  WHERE os_id = ordens_servico.id
), 0)
WHERE area_m2_manual = false;