import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MockOS, MockPeca } from "@/data/mockProducao";

async function fetchOrdensServico(): Promise<MockOS[]> {
  // Fetch OS with client join
  const { data: osList, error: osError } = await supabase
    .from("ordens_servico")
    .select(`
      *,
      clientes ( nome, supervisor, contato, endereco )
    `)
    .order("created_at", { ascending: false });

  if (osError) throw osError;
  if (!osList || osList.length === 0) return [];

  const osIds = osList.map((os) => os.id);

  // Fetch pecas, romaneios, registros in parallel
  const [pecasRes, romaneiosRes, registrosRes] = await Promise.all([
    supabase.from("pecas").select("*").in("os_id", osIds),
    supabase
      .from("romaneio_pecas")
      .select("romaneio_id, os_id, romaneios ( id, codigo, tipo_rota, status, data_saida, data_recebimento )")
      .in("os_id", osIds),
    supabase.from("registros").select("id, codigo, tipo, origem, status, urgencia, os_id, acao_produtiva, encaminhar_projetos").in("os_id", osIds),
  ]);

  // Group pecas by os_id
  const pecasByOs = new Map<string, MockPeca[]>();
  for (const p of pecasRes.data || []) {
    const list = pecasByOs.get(p.os_id) || [];
    list.push({
      id: p.id,
      item: p.item || "",
      descricao: p.descricao || "",
      quantidade: p.quantidade,
      comprimento: p.comprimento ?? 0,
      largura: p.largura ?? 0,
      precisa_45: p.precisa_45 ?? false,
      precisa_poliborda: p.precisa_poliborda ?? false,
      precisa_usinagem: p.precisa_usinagem ?? false,
      status_corte: p.status_corte || "pendente",
      cortador: p.cortador,
      status_45: p.status_45 || "pendente",
      operador_45: p.operador_45,
      status_poliborda: p.status_poliborda || "pendente",
      operador_poliborda: p.operador_poliborda,
      status_usinagem: p.status_usinagem || "pendente",
      operador_usinagem: p.operador_usinagem,
      status_acabamento: p.status_acabamento || "pendente",
      acabador: p.acabador,
      cabine: p.cabine,
      status_cq: p.status_cq || "pendente",
      cq_aprovado: p.cq_aprovado,
      cq_responsavel: p.cq_responsavel,
      cq_observacao: p.cq_observacao,
    });
    pecasByOs.set(p.os_id, list);
  }

  // Group romaneios by os_id (deduplicate by romaneio_id)
  const romaneiosByOs = new Map<
    string,
    { id: string; codigo: string; tipo_rota: string; status: string; data_saida: string | null; data_recebimento: string | null }[]
  >();
  const seenRomaneios = new Set<string>();
  for (const rp of romaneiosRes.data || []) {
    if (!rp.os_id || !rp.romaneios || seenRomaneios.has(`${rp.os_id}-${rp.romaneio_id}`)) continue;
    seenRomaneios.add(`${rp.os_id}-${rp.romaneio_id}`);
    const rom = rp.romaneios as any;
    const list = romaneiosByOs.get(rp.os_id) || [];
    list.push({
      id: rom.id,
      codigo: rom.codigo,
      tipo_rota: rom.tipo_rota,
      status: rom.status,
      data_saida: rom.data_saida,
      data_recebimento: rom.data_recebimento ?? null,
    });
    romaneiosByOs.set(rp.os_id, list);
  }

  // Group registros by os_id
  const registrosByOs = new Map<string, MockOS["registros"]>();
  for (const r of registrosRes.data || []) {
    if (!r.os_id) continue;
    const list = registrosByOs.get(r.os_id) || [];
    list.push({
      id: r.id,
      codigo: r.codigo,
      tipo: r.tipo || "",
      origem: (r as any).origem,
      status: r.status,
      urgencia: r.urgencia,
      encaminhar_projetos: (r as any).encaminhar_projetos ?? false,
      acao_produtiva: (r as any).acao_produtiva ?? null,
    });
    registrosByOs.set(r.os_id, list);
  }

  // Fetch registro_origem (origin record) for OSes generated from a registro
  const origemIds = osList.map((o: any) => o.registro_origem_id).filter(Boolean);
  const origemRegistrosMap = new Map<string, { encaminhar_projetos: boolean; status: string; codigo: string; acao_produtiva: string | null }>();
  if (origemIds.length > 0) {
    const { data: origemRegs } = await supabase
      .from("registros")
      .select("id, codigo, status, encaminhar_projetos, acao_produtiva")
      .in("id", origemIds as string[]);
    for (const r of origemRegs || []) {
      origemRegistrosMap.set(r.id, {
        encaminhar_projetos: (r as any).encaminhar_projetos ?? false,
        status: r.status,
        codigo: r.codigo,
        acao_produtiva: (r as any).acao_produtiva ?? null,
      });
    }
  }

  // Detect origem from codigo prefix
  function detectOrigem(codigo: string): "os" | "rep" | "oc" | "of" {
    const upper = codigo.toUpperCase();
    if (upper.startsWith("REP")) return "rep";
    if (upper.startsWith("OC")) return "oc";
    if (upper.startsWith("OF")) return "of";
    return "os";
  }

  return osList.map((os) => {
    const cliente = os.clientes as any;
    const origem = (os as any).registro_origem_id ? origemRegistrosMap.get((os as any).registro_origem_id) : null;
    return {
      id: os.id,
      codigo: os.codigo,
      cliente: cliente?.nome || "—",
      cliente_id: os.cliente_id || "",
      ambiente: os.ambiente || "",
      material: os.material || "",
      projetista: os.projetista || "",
      supervisor: cliente?.supervisor || "",
      area_m2: Number(os.area_m2) || 0,
      area_m2_manual: (os as any).area_m2_manual ?? false,
      data_emissao: os.data_emissao || os.created_at,
      data_entrega: os.data_entrega,
      status: os.status,
      localizacao: os.localizacao || "",
      origem: detectOrigem(os.codigo),
      terceiro: null,
      pdf_url: os.pdf_url,
      updated_at: os.updated_at,
      registro_origem_id: (os as any).registro_origem_id ?? null,
      registro_origem_aguarda_projetos: origem ? origem.encaminhar_projetos && origem.status !== "resolvido" : false,
      registro_origem_codigo: origem?.codigo ?? null,
      registro_origem_acao_produtiva: origem?.acao_produtiva ?? null,
      pecas: pecasByOs.get(os.id) || [],
      romaneios: romaneiosByOs.get(os.id) || [],
      registros: registrosByOs.get(os.id) || [],
    } as MockOS;
  });
}

export function useOrdensServico() {
  return useQuery({
    queryKey: ["ordens_servico"],
    queryFn: fetchOrdensServico,
  });
}
