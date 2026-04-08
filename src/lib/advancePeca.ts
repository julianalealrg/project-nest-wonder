import { supabase } from "@/integrations/supabase/client";

type StationKey = "corte" | "45" | "poliborda" | "usinagem" | "acabamento" | "cq";

interface AdvancePecaParams {
  pecaId: string;
  osId: string;
  osCodigo: string;
  pecaItem: string;
  station: StationKey;
  fields: Record<string, string>;
  userName: string;
}

export async function advancePecaStation({ pecaId, osId, osCodigo, pecaItem, station, fields, userName }: AdvancePecaParams) {
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
}
