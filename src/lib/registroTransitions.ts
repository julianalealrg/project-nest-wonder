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

export const REGISTRO_ORIGEM_LABELS: Record<string, { label: string; className: string }> = {
  obra: { label: "OBRA", className: "bg-purple-100 text-purple-700" },
  fabrica: { label: "FAB", className: "bg-stone-200 text-stone-600" },
  solicitacao: { label: "SOL", className: "bg-blue-100 text-blue-700" },
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
