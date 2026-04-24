export type EtapaPeca = "corte" | "45" | "poliborda" | "usinagem" | "acabamento" | "cq";

export function podeAvancarPecaPara(
  etapa: EtapaPeca,
  osStatus: string,
  romaneios?: { tipo_rota: string; status: string }[],
  pecas?: { id?: string; status_acabamento?: string | null }[],
  pecaIdEmAvanco?: string,
): { permitido: boolean; motivo?: string } {
  const base1 = [
    "cortando",
    "enviado_base2",
    "acabamento",
    "cq",
    "expedicao",
    "em_transito_cliente",
    "entregue",
    "terceiros",
  ];
  const base2Acabamento = ["acabamento", "cq", "expedicao", "em_transito_cliente", "entregue"];
  const base2Cq = ["cq", "expedicao", "em_transito_cliente", "entregue"];

  if (["corte", "45", "poliborda", "usinagem"].includes(etapa)) {
    if (!base1.includes(osStatus)) {
      return {
        permitido: false,
        motivo:
          "A OS precisa estar em Cortando (ou depois) para trabalhar essa etapa na Base 1.",
      };
    }
  }
  if (etapa === "acabamento") {
    if (!base2Acabamento.includes(osStatus)) {
      return {
        permitido: false,
        motivo:
          "A OS precisa ter sido recebida na Base 2 antes de avançar a peça para Acabamento.",
      };
    }
    // Validação extra: se há romaneios B1->B2 vinculados, exigir que pelo menos um tenha sido recebido
    if (romaneios && romaneios.length > 0) {
      const temB1B2 = romaneios.some((r) => r.tipo_rota === "base1_base2");
      const recebido = romaneios.some(
        (r) =>
          r.tipo_rota === "base1_base2" &&
          (r.status === "entregue" || r.status === "recebido"),
      );
      if (temB1B2 && !recebido) {
        return {
          permitido: false,
          motivo:
            "Base 2 ainda não confirmou o recebimento do romaneio B1→B2. Aguarde a conferência.",
        };
      }
    }
  }
  if (etapa === "cq") {
    if (!base2Cq.includes(osStatus)) {
      // Permissão especial: OS ainda em "acabamento", mas todas as outras peças
      // já estão com acabamento concluído (ou não aplicável). Nesse caso
      // liberamos o avanço — quem chamar é responsável por avançar a OS para "cq".
      if (osStatus === "acabamento" && pecas && pecas.length > 0) {
        const outrasPendentes = pecas.filter((p) => {
          if (pecaIdEmAvanco && p.id === pecaIdEmAvanco) return false;
          const st = p.status_acabamento;
          return st !== "concluido" && st !== "nao_aplicavel";
        });
        if (outrasPendentes.length === 0) {
          return { permitido: true };
        }
        return {
          permitido: false,
          motivo: `Ainda há ${outrasPendentes.length} peça(s) com acabamento pendente. Conclua o acabamento de todas as peças antes de aprovar no CQ.`,
        };
      }
      return {
        permitido: false,
        motivo: "A OS precisa estar em CQ antes de aprovar essa peça no CQ.",
      };
    }
  }
  return { permitido: true };
}
