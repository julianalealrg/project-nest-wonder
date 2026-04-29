// Status transitions for Registros module

export const REGISTRO_STATUS_TRANSITIONS: Record<string, string[]> = {
  aberto: ["em_producao", "aguardando_os"],
  aguardando_os: ["em_producao"],
  em_producao: ["enviado_base1", "enviado_base2", "enviado_obra"],
  enviado_base1: ["em_producao", "resolvido"],
  enviado_base2: ["em_producao", "resolvido"],
  enviado_obra: ["resolvido"],
};

export const REGISTRO_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_producao: "Em Produção",
  aguardando_os: "Aguardando OS",
  enviado_base1: "Enviado B1",
  enviado_base2: "Enviado B2",
  enviado_obra: "Enviado Obra",
  resolvido: "Resolvido",
};

// Labels alinhadas com o badge da OS (origemTag.ts) pra manter consistência
// na lista de Produção e na lista de Registros: mesma sigla, mesma cor.
export const REGISTRO_ORIGEM_LABELS: Record<string, { label: string; className: string }> = {
  obra: { label: "OC", className: "bg-nue-roxo/10 text-nue-roxo" },
  fabrica: { label: "OF", className: "bg-nue-chumbo/15 text-nue-chumbo" },
  solicitacao: { label: "REP", className: "bg-nue-azul/10 text-nue-azul" },
};

export const REGISTRO_URGENCIA_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function getNextRegistroStatuses(currentStatus: string): string[] {
  return REGISTRO_STATUS_TRANSITIONS[currentStatus] || [];
}
