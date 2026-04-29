// Centralized color classes for status/urgency badges across modules.
// Uses NUE expanded palette tokens defined in tailwind.config + index.css.
// All classes are tailwind utilities — keep usage in badge-style chips
// (small chips with subtle bg + dark/colored text), never large surfaces.

export const OS_STATUS_BADGE: Record<string, string> = {
  aguardando_material: "bg-muted text-muted-foreground",
  fila_corte: "bg-nue-laranja/10 text-nue-laranja",
  cortando: "bg-nue-laranja/15 text-nue-laranja",
  enviado_base2: "bg-nue-azul/10 text-nue-azul",
  acabamento: "bg-nue-laranja/10 text-nue-laranja",
  cq: "bg-nue-amarelo/15 text-nue-amarelo",
  expedicao: "bg-nue-azul/15 text-nue-azul",
  em_transito: "bg-nue-azul/10 text-nue-azul",
  entregue: "bg-nue-verde/15 text-nue-verde",
  terceiros: "bg-nue-chumbo/15 text-nue-chumbo",
};

export const REGISTRO_STATUS_BADGE: Record<string, string> = {
  aberto: "bg-nue-amarelo/15 text-nue-amarelo",
  em_producao: "bg-nue-laranja/15 text-nue-laranja",
  aguardando_os: "bg-nue-roxo/15 text-nue-roxo",
  enviado_base1: "bg-nue-azul/10 text-nue-azul",
  enviado_base2: "bg-nue-azul/10 text-nue-azul",
  enviado_obra: "bg-nue-azul/15 text-nue-azul",
  resolvido: "bg-nue-verde/15 text-nue-verde",
};

export const URGENCIA_BADGE: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-nue-amarelo/15 text-nue-amarelo",
  alta: "bg-nue-laranja/15 text-nue-laranja",
  critica: "bg-nue-vermelho/15 text-nue-vermelho",
};

export const ROMANEIO_STATUS_BADGE: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_transito: "bg-nue-azul/10 text-nue-azul",
  entregue: "bg-nue-verde/15 text-nue-verde",
  cancelado: "bg-red-100 text-red-700 line-through",
};

export function osBadgeClass(status: string): string {
  return OS_STATUS_BADGE[status] || "bg-muted text-muted-foreground";
}
export function registroBadgeClass(status: string): string {
  return REGISTRO_STATUS_BADGE[status] || "bg-muted text-muted-foreground";
}
export function urgenciaBadgeClass(urgencia: string): string {
  return URGENCIA_BADGE[urgencia] || "bg-muted text-muted-foreground";
}
export function romaneioBadgeClass(status: string): string {
  return ROMANEIO_STATUS_BADGE[status] || "bg-muted text-muted-foreground";
}
