// Status transitions and location mapping for OS workflow

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  aguardando_material: ["fila_corte"],
  fila_corte: ["cortando"],
  cortando: ["enviado_base2", "terceiros"],
  enviado_base2: ["acabamento"],
  acabamento: ["cq", "enviado_base1"],
  cq: ["expedicao", "acabamento", "enviado_base1"],
  enviado_base1: ["cortando"],
  expedicao: ["entregue"],
  terceiros: ["entregue", "terceiros_recusado"],
  terceiros_recusado: ["cortando", "terceiros"],
};

export const STATUS_LOCATION: Record<string, string> = {
  aguardando_material: "CD",
  fila_corte: "Base 1",
  cortando: "Base 1",
  enviado_base2: "Trânsito",
  acabamento: "Base 2",
  cq: "Base 2",
  expedicao: "Base 2",
  enviado_base1: "Trânsito",
  entregue: "Cliente",
  terceiros: "Terceiro",
  terceiros_recusado: "Base 1",
};

export const STATUS_LABELS: Record<string, string> = {
  aguardando_material: "Ag. Material",
  fila_corte: "Fila Corte",
  cortando: "Cortando",
  enviado_base2: "Env. B2",
  acabamento: "Acabamento",
  cq: "CQ",
  expedicao: "Expedição",
  enviado_base1: "Retorno à B1",
  entregue: "Entregue",
  terceiros: "Terceiros",
  terceiros_recusado: "Terceiro recusou",
};

export function getNextStatuses(currentStatus: string): string[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}
