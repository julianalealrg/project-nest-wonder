import type { MockOS } from "@/data/mockProducao";

/**
 * Guard result for an attempted OS status transition.
 * - kind = "ok": transition can proceed normally with the standard StatusChangeDialog.
 * - kind = "blocked": transition cannot proceed; show explanation. Optionally provides
 *   an action button that opens a popup (romaneio, conferência, etc.).
 * - kind = "popup": transition is gated behind an integrated popup that, when completed,
 *   will perform the status change automatically.
 */
export type GuardResult =
  | { kind: "ok" }
  | {
      kind: "blocked";
      title: string;
      message: string;
      actionLabel?: string;
      action?: GuardAction;
    }
  | {
      kind: "popup";
      title: string;
      message: string;
      actionLabel: string;
      action: GuardAction;
    };

export type GuardAction =
  | { type: "open_romaneio"; tipoRota: string; osId: string }
  | { type: "open_conferencia_entrada"; osId: string }
  | { type: "open_entrega_cliente"; osId: string }
  | { type: "open_terceiro"; osId: string };

function allConcluido(os: MockOS, key: keyof MockOS["pecas"][number]): boolean {
  if (!os.pecas.length) return false;
  return os.pecas.every((p) => p[key] === "concluido" || p[key] === "aprovado" || p[key] === "nao_aplicavel");
}

function hasRomaneio(os: MockOS, tipoRota: string, statusFilter?: string[]): boolean {
  return os.romaneios.some(
    (r) => r.tipo_rota === tipoRota && (!statusFilter || statusFilter.includes(r.status))
  );
}

/**
 * Evaluates whether the given OS can transition from current status to the next.
 * Returns a GuardResult describing the action to take.
 */
export function evaluateTransition(os: MockOS, toStatus: string): GuardResult {
  const from = os.status;

  // Cortando -> Enviado Base 2 : requires Romaneio B1->B2
  if (from === "cortando" && toStatus === "enviado_base2") {
    if (!hasRomaneio(os, "base1_base2")) {
      return {
        kind: "popup",
        title: "Gerar romaneio Base 1 → Base 2",
        message:
          "Para enviar esta OS para a Base 2, é necessário gerar um romaneio Base 1 → Base 2 com as peças cortadas.",
        actionLabel: "Gerar romaneio agora",
        action: { type: "open_romaneio", tipoRota: "base1_base2", osId: os.id },
      };
    }
    return { kind: "ok" };
  }

  // Cortando -> Terceiros : open terceiro popup (ask which one + generate B1->Terceiro romaneio)
  if (from === "cortando" && toStatus === "terceiros") {
    return {
      kind: "popup",
      title: "Enviar para terceiro",
      message: "Informe qual terceiro receberá esta OS. Um romaneio será gerado automaticamente.",
      actionLabel: "Selecionar terceiro",
      action: { type: "open_terceiro", osId: os.id },
    };
  }

  // Enviado Base 2 -> Acabamento : requires romaneio recebido + conferido
  if (from === "enviado_base2" && toStatus === "acabamento") {
    const recebido = os.romaneios.some(
      (r) => r.tipo_rota === "base1_base2" && r.status === "entregue"
    );
    if (!recebido) {
      return {
        kind: "popup",
        title: "Confirmar recebimento na Base 2",
        message:
          "Para iniciar o acabamento, a Base 2 precisa receber e conferir as peças do romaneio Base 1 → Base 2.",
        actionLabel: "Conferir recebimento",
        action: { type: "open_conferencia_entrada", osId: os.id },
      };
    }
    return { kind: "ok" };
  }

  // Acabamento -> CQ : todas peças com acabamento concluído
  if (from === "acabamento" && toStatus === "cq") {
    if (!allConcluido(os, "status_acabamento")) {
      const pendentes = os.pecas.filter(
        (p) => p.status_acabamento !== "concluido" && p.status_acabamento !== "nao_aplicavel"
      ).length;
      return {
        kind: "blocked",
        title: "Acabamento incompleto",
        message: `Para enviar ao CQ, todas as peças precisam estar com acabamento concluído. Faltam ${pendentes} peça(s).`,
      };
    }
    return { kind: "ok" };
  }

  // CQ -> Expedição : todas peças aprovadas no CQ
  if (from === "cq" && toStatus === "expedicao") {
    if (!allConcluido(os, "status_cq")) {
      const pendentes = os.pecas.filter((p) => p.status_cq !== "aprovado").length;
      return {
        kind: "blocked",
        title: "CQ pendente",
        message: `Para liberar para expedição, todas as peças precisam estar aprovadas no CQ. Faltam ${pendentes} peça(s).`,
      };
    }
    return { kind: "ok" };
  }

  // Expedição -> Entregue : exige romaneio B2->Cliente + recebimento confirmado pelo cliente
  if (from === "expedicao" && toStatus === "entregue") {
    const romB2Cliente = os.romaneios.find((r) => r.tipo_rota === "base2_cliente");
    if (!romB2Cliente) {
      return {
        kind: "popup",
        title: "Gerar romaneio de entrega",
        message:
          "Para marcar como entregue, é necessário gerar o romaneio Base 2 → Cliente. A entrega só será concluída após confirmação do cliente.",
        actionLabel: "Gerar romaneio de entrega",
        action: { type: "open_romaneio", tipoRota: "base2_cliente", osId: os.id },
      };
    }
    if (romB2Cliente.status !== "entregue") {
      return {
        kind: "blocked",
        title: "Aguardando confirmação do cliente",
        message:
          "O romaneio de entrega já foi gerado, mas ainda não foi confirmado pelo cliente. Acesse Logística para registrar a confirmação com a foto do romaneio assinado.",
        actionLabel: "Ir para Logística",
        action: { type: "open_entrega_cliente", osId: os.id },
      };
    }
    return { kind: "ok" };
  }

  return { kind: "ok" };
}
