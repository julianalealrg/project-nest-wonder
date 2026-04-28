import { supabase } from "@/integrations/supabase/client";

export type OrigemRegistro = "obra" | "fabrica" | "solicitacao";

export async function gerarCodigoRegistro(origem: OrigemRegistro): Promise<string> {
  const prefix = origem === "obra" ? "OC" : origem === "fabrica" ? "OF" : "REP";
  const year = new Date().getFullYear().toString().slice(-2);
  const codePrefix = `${prefix}${year}-`;

  const { data } = await supabase
    .from("registros")
    .select("codigo")
    .like("codigo", `${codePrefix}%`)
    .order("codigo", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].codigo.replace(codePrefix, ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return `${codePrefix}${String(nextNum).padStart(3, "0")}`;
}
