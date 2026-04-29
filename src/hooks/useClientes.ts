import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cliente {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  email: string | null;
  telefone: string | null;
  contato: string | null;
  endereco: string | null;
  supervisor: string | null;
  arquiteta: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClienteComResumo extends Cliente {
  total_os: number;
  area_m2_total: number;
  ocorrencias_abertas: number;
  ultima_atividade: string | null;
}

async function fetchClientes(): Promise<ClienteComResumo[]> {
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw error;
  if (!clientes) return [];

  const ids = clientes.map((c) => c.id);
  if (ids.length === 0) return [];

  const { data: osList } = await supabase
    .from("ordens_servico")
    .select("id, cliente_id, area_m2, updated_at, status")
    .in("cliente_id", ids);

  const osByCliente = new Map<string, { ids: string[]; area: number; ultima: string | null }>();
  for (const os of osList || []) {
    if (!os.cliente_id) continue;
    const cur = osByCliente.get(os.cliente_id) || { ids: [], area: 0, ultima: null };
    cur.ids.push(os.id);
    cur.area += os.area_m2 ?? 0;
    if (!cur.ultima || (os.updated_at && os.updated_at > cur.ultima)) {
      cur.ultima = os.updated_at;
    }
    osByCliente.set(os.cliente_id, cur);
  }

  const allOsIds = (osList || []).map((o) => o.id);
  let registrosAbertosPorOs = new Map<string, number>();
  if (allOsIds.length > 0) {
    const { data: regs } = await supabase
      .from("registros")
      .select("os_id, status, acao_produtiva")
      .in("os_id", allOsIds);
    for (const r of regs || []) {
      if (!r.os_id) continue;
      const isAberto = r.status !== "resolvido" && !r.acao_produtiva;
      if (!isAberto) continue;
      registrosAbertosPorOs.set(r.os_id, (registrosAbertosPorOs.get(r.os_id) || 0) + 1);
    }
  }

  return clientes.map((c) => {
    const resumo = osByCliente.get(c.id);
    const osIds = resumo?.ids || [];
    const ocorrencias = osIds.reduce(
      (acc, id) => acc + (registrosAbertosPorOs.get(id) || 0),
      0,
    );
    return {
      ...c,
      total_os: osIds.length,
      area_m2_total: Math.round((resumo?.area || 0) * 100) / 100,
      ocorrencias_abertas: ocorrencias,
      ultima_atividade: resumo?.ultima || null,
    };
  });
}

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
    staleTime: 30_000,
  });
}

async function fetchCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Cliente | null;
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ["clientes", id],
    queryFn: () => (id ? fetchCliente(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export interface OSDoCliente {
  id: string;
  codigo: string;
  status: string;
  origem: string | null;
  area_m2: number | null;
  ambiente: string | null;
  material: string | null;
  data_emissao: string | null;
  data_entrega: string | null;
  updated_at: string;
}

async function fetchOSDoCliente(clienteId: string): Promise<OSDoCliente[]> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("id, codigo, status, origem, area_m2, ambiente, material, data_emissao, data_entrega, updated_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as OSDoCliente[];
}

export function useOSDoCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["clientes", clienteId, "os"],
    queryFn: () => (clienteId ? fetchOSDoCliente(clienteId) : Promise.resolve([])),
    enabled: !!clienteId,
  });
}
