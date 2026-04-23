// Guards e ações automáticas para transições de status da OS
import type { MockOS } from "@/data/mockProducao";

export type GuardAction =
  | { kind: "allow" }
  | { kind: "blocked"; title: string; reason: string; details?: string[] }
  | { kind: "open_romaneio"; tipoRota: string; presetOsId: string }
  | { kind: "select_terceiro" }
  | { kind: "confirm_entrega" };

/**
 * Avalia se uma transição precisa de ação especial (popup automático,
 * bloqueio ou redirecionamento) antes de simplesmente atualizar o status.
 */
export function evaluateTransition(os: MockOS, toStatus: string): GuardAction {
  const pecas = os.pecas || [];

  // Cortando -> Enviado Base 2 : abrir popup de Novo Romaneio (B1->B2) já com a OS pré-selecionada
  if (os.status === "cortando" && toStatus === "enviado_base2") {
    const pendentes = pecas.filter((p) => p.status_corte !== "concluido" && p.status_corte !== "nao_aplicavel");
    if (pendentes.length > 0) {
      return {
        kind: "blocked",
        title: "Peças de corte pendentes",
        reason: `${pendentes.length} peça(s) ainda não foram concluídas no Corte.`,
        details: pendentes.map((p) => `${p.item} — ${p.descricao}`),
      };
    }
    return { kind: "open_romaneio", tipoRota: "base1_base2", presetOsId: os.id };
  }

  // Cortando -> Terceiros : escolher terceiro
  if (os.status === "cortando" && toStatus === "terceiros") {
    return { kind: "select_terceiro" };
  }

  // Acabamento -> CQ : todas as peças que precisam de acabamento devem estar concluídas
  if (os.status === "acabamento" && toStatus === "cq") {
    const pendentes = pecas.filter((p) => p.status_acabamento !== "concluido" && p.status_acabamento !== "nao_aplicavel");
    if (pendentes.length > 0) {
      return {
        kind: "blocked",
        title: "Acabamento pendente",
        reason: `${pendentes.length} peça(s) ainda não foram concluídas no Acabamento.`,
        details: pendentes.map((p) => `${p.item} — ${p.descricao}`),
      };
    }
  }

  // CQ -> Expedição : todas as peças aprovadas no CQ
  if (os.status === "cq" && toStatus === "expedicao") {
    const naoAprovadas = pecas.filter((p) => p.status_cq !== "aprovado" && p.status_cq !== "nao_aplicavel");
    if (naoAprovadas.length > 0) {
      return {
        kind: "blocked",
        title: "CQ pendente",
        reason: `${naoAprovadas.length} peça(s) ainda não foram aprovadas no CQ.`,
        details: naoAprovadas.map((p) => `${p.item} — ${p.descricao}`),
      };
    }
  }

  // Expedição -> Entregue : abrir popup de confirmação com foto
  if (os.status === "expedicao" && toStatus === "entregue") {
    return { kind: "confirm_entrega" };
  }

  // Terceiros -> Entregue : também precisa confirmar
  if (os.status === "terceiros" && toStatus === "entregue") {
    return { kind: "confirm_entrega" };
  }

  return { kind: "allow" };
}
