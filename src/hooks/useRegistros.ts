import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RegistroPeca {
  id: string;
  item: string | null;
  descricao: string | null;
  quantidade: number | null;
  medida_atual: string | null;
  medida_necessaria: string | null;
  nao_consta_os: boolean | null;
}

export interface Registro {
  id: string;
  codigo: string;
  origem: string;
  numero_os: string | null;
  os_id: string | null;
  cliente: string | null;
  material: string | null;
  ambiente: string | null;
  supervisor: string | null;
  projetista: string | null;
  aberto_por: string | null;
  tipo: string | null;
  tipo_outro: string | null;
  urgencia: string;
  status: string;
  justificativa: string | null;
  responsavel_erro_papel: string | null;
  responsavel_erro_nome: string | null;
  acabador_responsavel: string | null;
  encaminhar_projetos: boolean | null;
  instrucao_projetos: string | null;
  requer_recolha: boolean | null;
  recolha_origem: string | null;
  recolha_destino: string | null;
  created_at: string;
  updated_at: string;
  pecas: RegistroPeca[];
  evidencias: { id: string; url_foto: string }[];
}

export function useRegistros() {
  return useQuery({
    queryKey: ["registros"],
    queryFn: async (): Promise<Registro[]> => {
      const { data: registros, error } = await supabase
        .from("registros")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!registros || registros.length === 0) return [];

      const ids = registros.map((r) => r.id);

      const [pecasRes, evidenciasRes] = await Promise.all([
        supabase.from("registro_pecas").select("*").in("registro_id", ids),
        supabase.from("evidencias").select("id, url_foto, registro_id").in("registro_id", ids),
      ]);

      const pecasMap = new Map<string, RegistroPeca[]>();
      (pecasRes.data || []).forEach((p) => {
        const list = pecasMap.get(p.registro_id) || [];
        list.push(p);
        pecasMap.set(p.registro_id, list);
      });

      const evidenciasMap = new Map<string, { id: string; url_foto: string }[]>();
      (evidenciasRes.data || []).forEach((e: any) => {
        const list = evidenciasMap.get(e.registro_id) || [];
        list.push({ id: e.id, url_foto: e.url_foto });
        evidenciasMap.set(e.registro_id, list);
      });

      return registros.map((r) => ({
        ...r,
        pecas: pecasMap.get(r.id) || [],
        evidencias: evidenciasMap.get(r.id) || [],
      }));
    },
  });
}
