import { supabase } from "@/integrations/supabase/client";
import { podeAvancarPecaPara } from "@/lib/pecaStationGuards";
import { calcularSugestaoAvanco } from "@/lib/avancoSugerido";
import { toast } from "@/hooks/use-toast";

type StationKey = "corte" | "45" | "poliborda" | "usinagem" | "acabamento" | "cq";

interface AdvancePecaParams {
  pecaId: string;
  osId: string;
  osCodigo: string;
  pecaItem: string;
  station: StationKey;
  fields: Record<string, string>;
  userName: string;
  osStatus?: string;
}

export async function advancePecaStation({ pecaId, osId, osCodigo, pecaItem, station, fields, userName, osStatus }: AdvancePecaParams) {
  if (osStatus) {
    // Buscar romaneios vinculados para validar guard de Acabamento (B1->B2 deve ter sido recebido)
    let romaneios: { tipo_rota: string; status: string }[] | undefined;
    if (station === "acabamento") {
      const { data: rps } = await supabase
        .from("romaneio_pecas")
        .select("romaneios(tipo_rota, status)")
        .eq("os_id", osId);
      romaneios = (rps || [])
        .map((rp: any) => rp.romaneios)
        .filter(Boolean)
        .map((r: any) => ({ tipo_rota: r.tipo_rota, status: r.status }));
    }
    // Para CQ, buscar peças da OS para permitir avanço quando OS ainda está em "acabamento"
    // mas todas as outras peças já têm acabamento concluído.
    let pecasGuard: { id: string; status_acabamento: string | null }[] | undefined;
    if (station === "cq") {
      const { data: pecasRows } = await supabase
        .from("pecas")
        .select("id, status_acabamento")
        .eq("os_id", osId);
      pecasGuard = (pecasRows || []) as any;
    }
    const guard = podeAvancarPecaPara(station, osStatus, romaneios, pecasGuard, pecaId);
    if (!guard.permitido) {
      throw new Error(guard.motivo || "Avanço bloqueado pelo status da OS.");
    }
  }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  switch (station) {
    case "corte":
      update.status_corte = "concluido";
      update.cortador = fields.cortador;
      break;
    case "45":
      update.status_45 = "concluido";
      update.operador_45 = fields.operador;
      break;
    case "poliborda":
      update.status_poliborda = "concluido";
      update.operador_poliborda = fields.operador;
      break;
    case "usinagem":
      update.status_usinagem = "concluido";
      update.operador_usinagem = fields.operador;
      break;
    case "acabamento":
      update.status_acabamento = "concluido";
      update.acabador = fields.acabador;
      update.cabine = fields.cabine;
      break;
    case "cq":
      if (fields.cq_result === "aprovado") {
        update.status_cq = "aprovado";
        update.cq_aprovado = true;
      } else {
        update.status_cq = "reprovado";
        update.cq_aprovado = false;
        update.cq_observacao = fields.observacao;
        // Reset acabamento so piece goes back
        update.status_acabamento = "pendente";
      }
      update.cq_responsavel = fields.responsavel;
      break;
  }

  const { error } = await supabase.from("pecas").update(update as any).eq("id", pecaId);
  if (error) throw error;

  const stationLabels: Record<string, string> = {
    corte: "Corte", "45": "45°", poliborda: "Poliborda",
    usinagem: "Usinagem", acabamento: "Acabamento", cq: "CQ",
  };

  await supabase.from("activity_logs").insert({
    action: "avanco_peca",
    entity_type: "pecas",
    entity_id: pecaId,
    entity_description: `${osCodigo} - Peça ${pecaItem}`,
    user_name: userName,
    details: {
      os_id: osId,
      estacao: stationLabels[station],
      ...fields,
    },
  });

  // Recarregar OS + peças e verificar se há sugestão de avanço
  try {
    const [{ data: osRow }, { data: pecasRows }] = await Promise.all([
      supabase.from("ordens_servico").select("status").eq("id", osId).maybeSingle(),
      supabase.from("pecas").select("*").eq("os_id", osId),
    ]);
    if (osRow && pecasRows) {
      const sugestao = calcularSugestaoAvanco({ status: osRow.status, pecas: pecasRows as any });
      if (sugestao) {
        toast({
          title: `Todas as peças de ${osCodigo} concluíram a etapa`,
          description: `Avance a OS para ${sugestao.label} no painel lateral.`,
        });
      }
    }
  } catch {
    // não bloqueia o avanço caso falhe
  }
}
