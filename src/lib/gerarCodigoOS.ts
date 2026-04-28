import { supabase } from "@/integrations/supabase/client";

export type OrigemOS = "os" | "rep" | "oc" | "of";

/**
 * Gera o próximo código sequencial de OS no formato {PREFIX}{YY}-{NNN}.
 * O prefixo varia por origem:
 *   os  → OS  (OS normal, criada manualmente)
 *   rep → REP (gerada de Solicitação de Reposição)
 *   oc  → OC  (gerada de Ocorrência de Obra)
 *   of  → OF  (gerada de Ocorrência de Fábrica)
 *
 * Sequência separada por prefixo: REP26-001 e OS26-001 coexistem sem colidir.
 */
export async function gerarCodigoOS(origem: OrigemOS = "os"): Promise<string> {
  const prefixMap: Record<OrigemOS, string> = {
    os: "OS",
    rep: "REP",
    oc: "OC",
    of: "OF",
  };
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `${prefixMap[origem]}${year}-`;

  const { data } = await supabase
    .from("ordens_servico")
    .select("codigo")
    .like("codigo", `${prefix}%`)
    .order("codigo", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const last = data[0].codigo.replace(prefix, "");
    const n = parseInt(last, 10);
    if (!isNaN(n)) nextNum = n + 1;
  }
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}
