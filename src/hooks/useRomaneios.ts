import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RomaneioPeca {
  id: string;
  peca_id: string;
  os_id: string | null;
  conferencia: string | null;
  observacao: string | null;
  // joined
  peca_item: string;
  peca_descricao: string;
  comprimento: number | null;
  largura: number | null;
  material: string | null;
  os_codigo: string;
  cliente_nome: string;
}

export interface Romaneio {
  id: string;
  codigo: string;
  tipo_rota: string;
  status: string;
  motorista: string | null;
  ajudante: string | null;
  endereco_destino: string | null;
  observacoes: string | null;
  data_saida: string | null;
  data_recebimento: string | null;
  recebido_por: string | null;
  pdf_url: string | null;
  created_at: string;
  pecas: RomaneioPeca[];
  os_codigos: string[];
  cliente_nome: string;
}

export const ROTA_LABELS: Record<string, string> = {
  base1_base2: "Base 1 → Base 2",
  base2_cliente: "Base 2 → Cliente",
  base1_cliente: "Base 1 → Cliente",
  base2_base1: "Base 2 → Base 1",
  recolha: "Recolha — Obra → Base 1",
};

export const ROMANEIO_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_transito: "Em Trânsito",
  entregue: "Entregue",
};

export function useRomaneios() {
  return useQuery({
    queryKey: ["romaneios"],
    queryFn: async (): Promise<Romaneio[]> => {
      const { data: romaneios, error } = await supabase
        .from("romaneios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!romaneios || romaneios.length === 0) return [];

      const ids = romaneios.map((r) => r.id);

      const { data: rpData } = await supabase
        .from("romaneio_pecas")
        .select(`
          id, peca_id, os_id, conferencia, observacao, romaneio_id,
          pecas ( item, descricao, comprimento, largura ),
          ordens_servico ( codigo, material, clientes ( nome ) )
        `)
        .in("romaneio_id", ids);

      const pecasMap = new Map<string, RomaneioPeca[]>();
      const osCodigosMap = new Map<string, Set<string>>();
      const clienteMap = new Map<string, string>();

      for (const rp of rpData || []) {
        const peca = rp.pecas as any;
        const os = rp.ordens_servico as any;
        const osCodigo = os?.codigo || "";
        const clienteNome = os?.clientes?.nome || "";

        const item: RomaneioPeca = {
          id: rp.id,
          peca_id: rp.peca_id,
          os_id: rp.os_id,
          conferencia: rp.conferencia,
          observacao: rp.observacao,
          peca_item: peca?.item || "",
          peca_descricao: peca?.descricao || "",
          comprimento: peca?.comprimento ?? null,
          largura: peca?.largura ?? null,
          material: os?.material ?? null,
          os_codigo: osCodigo,
          cliente_nome: clienteNome,
        };

        const list = pecasMap.get(rp.romaneio_id) || [];
        list.push(item);
        pecasMap.set(rp.romaneio_id, list);

        if (osCodigo) {
          const set = osCodigosMap.get(rp.romaneio_id) || new Set();
          set.add(osCodigo);
          osCodigosMap.set(rp.romaneio_id, set);
        }
        if (clienteNome) clienteMap.set(rp.romaneio_id, clienteNome);
      }

      return romaneios.map((r) => ({
        ...r,
        pecas: pecasMap.get(r.id) || [],
        os_codigos: [...(osCodigosMap.get(r.id) || [])],
        cliente_nome: clienteMap.get(r.id) || "—",
      }));
    },
  });
}
