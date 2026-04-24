/**
 * Mapeamento centralizado do tipo de OS (origem) para label e cores de badge/linha.
 * Usado tanto pela tabela de Produção quanto pelo header da página OSDetalhe.
 */
export interface OrigemTagInfo {
  label: string;
  badgeClass: string; // bg/text para o badge
  rowClass: string; // bg muito sutil para a linha inteira
}

export function getOrigemTagInfo(origem: string): OrigemTagInfo {
  const map: Record<string, OrigemTagInfo> = {
    os: {
      label: "Normal",
      badgeClass: "bg-nue-cinza/15 text-nue-chumbo",
      rowClass: "",
    },
    rep: {
      label: "REP",
      badgeClass: "bg-nue-azul/15 text-nue-azul",
      rowClass: "bg-nue-azul/5",
    },
    oc: {
      label: "OC",
      badgeClass: "bg-nue-roxo/15 text-nue-roxo",
      rowClass: "bg-nue-roxo/5",
    },
    of: {
      label: "OF",
      badgeClass: "bg-nue-chumbo/20 text-nue-chumbo",
      rowClass: "bg-nue-chumbo/5",
    },
  };
  return map[origem?.toLowerCase()] || map.os;
}
