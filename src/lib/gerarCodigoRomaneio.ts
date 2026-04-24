// Helper para gerar códigos de romaneio no novo padrão:
// ROM-{B1B2|B2B1|B2C|B1C|B1T|REC}-{YY}-{NNN}
// Romaneios antigos (ROM-2026-XXXX) permanecem inalterados; só os novos seguem este padrão.
import { supabase } from "@/integrations/supabase/client";

const ROTA_TO_SUFFIX: Record<string, string> = {
  base1_base2: "B1B2",
  base2_base1: "B2B1",
  base2_cliente: "B2C",
  base1_cliente: "B1C",
  base1_terceiro: "B1T",
  recolha: "REC",
};

export async function gerarCodigoRomaneio(tipoRota: string): Promise<string> {
  const suffix = ROTA_TO_SUFFIX[tipoRota] || "GEN";
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `ROM-${suffix}-${yy}-`;

  const { data: last } = await supabase
    .from("romaneios")
    .select("codigo")
    .like("codigo", `${prefix}%`)
    .order("codigo", { ascending: false })
    .limit(1);

  let next = 1;
  if (last && last.length > 0) {
    const n = parseInt(last[0].codigo.replace(prefix, ""), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
}
