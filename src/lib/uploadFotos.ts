import { supabase } from "@/integrations/supabase/client";

const BUCKET = "ocorrencias-fotos";

/**
 * Faz upload de uma lista de arquivos no bucket de ocorrências e retorna as URLs públicas.
 * O `pathPrefix` separa as fotos por contexto (ex: `romaneio/<id>`, `registro/<id>`).
 * Falhas individuais são silenciosamente ignoradas (logadas no console).
 */
export async function uploadFotos(files: File[], pathPrefix: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.error(`Falha no upload de ${file.name}:`, error);
      continue;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function uploadUmaFoto(file: File, pathPrefix: string): Promise<string | null> {
  const [url] = await uploadFotos([file], pathPrefix);
  return url || null;
}
