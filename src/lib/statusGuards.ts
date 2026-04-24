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
  const isRetrabalhoOnly =
    !!(os as any).registro_origem_id && (os as any).registro_origem_acao_produtiva === "apenas_retrabalho";

  // OS de "apenas retrabalho" começa em Acabamento e nunca passa pela Base 1 / trânsito.
  // Liberamos transições que normalmente dependem de romaneio B1→B2.
  if (isRetrabalhoOnly && os.status === "enviado_base2" && toStatus === "acabamento") {
    return { kind: "allow" };
  }

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

  // Enviado Base 2 -> Acabamento : exige conferência do romaneio B1->B2 na Base 2
  if (os.status === "enviado_base2" && toStatus === "acabamento") {
    const romaneios = (os as any).romaneios || [];
    const romB1B2 = romaneios.find((r: any) => r.tipo_rota === "base1_base2");
    const recebido =
      romB1B2 && (romB1B2.status === "entregue" || romB1B2.status === "recebido");
    if (!recebido) {
      return {
        kind: "blocked",
        title: "Aguardando conferência na Base 2",
        reason:
          "Esta OS só pode ir para Acabamento depois que a Base 2 conferir e confirmar o recebimento do romaneio B1→B2. Vá para Logística e confirme o recebimento.",
      };
    }
    return { kind: "allow" };
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

  // Expedição -> Entregue : exige romaneio Base 2 → Cliente vinculado e recebido
  if (os.status === "expedicao" && toStatus === "entregue") {
    const romaneios = (os as any).romaneios || [];
    const rom = romaneios.find((r: any) => r.tipo_rota === "base2_cliente");
    if (!rom) {
      return {
        kind: "open_romaneio",
        tipoRota: "base2_cliente",
        presetOsId: os.id,
      };
    }
    if (rom.status !== "entregue" && rom.status !== "recebido") {
      return {
        kind: "blocked",
        title: "Aguardando confirmação do cliente",
        reason:
          "O romaneio Base 2 → Cliente já foi criado, mas o cliente ainda não confirmou o recebimento. Acesse Logística e registre a confirmação com a foto do romaneio assinado.",
      };
    }
    return { kind: "confirm_entrega" };
  }

  // Terceiros -> Entregue : exige romaneio Base 1 → Cliente vinculado e recebido
  if (os.status === "terceiros" && toStatus === "entregue") {
    const romaneios = (os as any).romaneios || [];
    const rom = romaneios.find((r: any) => r.tipo_rota === "base1_cliente");
    if (!rom) {
      return {
        kind: "open_romaneio",
        tipoRota: "base1_cliente",
        presetOsId: os.id,
      };
    }
    if (rom.status !== "entregue" && rom.status !== "recebido") {
      return {
        kind: "blocked",
        title: "Aguardando confirmação do cliente",
        reason:
          "O romaneio Base 1 → Cliente já foi criado, mas o cliente ainda não confirmou o recebimento. Acesse Logística e registre a confirmação.",
      };
    }
    return { kind: "confirm_entrega" };
  }

  return { kind: "allow" };
}

function hasRomaneio(os: MockOS, tipoRota: string, statusFilter?: string[]): boolean {
  const romaneios = (os as any).romaneios || [];
  return romaneios.some(
    (r: any) => r.tipo_rota === tipoRota && (!statusFilter || statusFilter.includes(r.status))
  );
}
