import { supabase } from "@/integrations/supabase/client";

/**
 * Gera o próximo código sequencial de OS no formato OS{YY}-{NNN}.
 * Ex: OS26-001, OS26-002, ...
 * O ano é o ano corrente em 2 dígitos. Independe da origem.
 */
export async function gerarCodigoOS(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `OS${year}-`;

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
