import type { MockOS, MockPeca } from "@/data/mockProducao";

interface AvancoSugerido {
  proximoStatus: string;
  label: string;
}

type OSLike = Pick<MockOS, "status"> & { pecas: MockPeca[] };

export function calcularSugestaoAvanco(os: OSLike): AvancoSugerido | null {
  if (!os.pecas || os.pecas.length === 0) return null;

  if (os.status === "cortando") {
    const ok = os.pecas.every(
      (p) =>
        p.status_corte === "concluido" &&
        (!p.precisa_45 || p.status_45 === "concluido") &&
        (!p.precisa_poliborda || p.status_poliborda === "concluido") &&
        (!p.precisa_usinagem || p.status_usinagem === "concluido"),
    );
    if (ok) return { proximoStatus: "enviado_base2", label: "p/ B2" };
  }

  if (os.status === "acabamento") {
    if (os.pecas.every((p) => p.status_acabamento === "concluido")) {
      return { proximoStatus: "cq", label: "CQ" };
    }
  }

  if (os.status === "cq") {
    if (os.pecas.every((p) => p.status_cq === "aprovado")) {
      return { proximoStatus: "expedicao", label: "Expedição" };
    }
  }

  return null;
}

interface DependenciaSugerida {
  tipo: "aguarda_romaneio_b1b2" | "aguarda_conferencia_b2";
  label: string;
}

type OSWithRomaneios = Pick<MockOS, "status"> & {
  romaneios?: { tipo_rota: string; status: string; data_recebimento?: string | null }[];
};

export function calcularDependencia(os: OSWithRomaneios): DependenciaSugerida | null {
  const romaneios = os.romaneios || [];

  if (os.status === "cortando") {
    const temRomaneioB1B2 = romaneios.some((r) => r.tipo_rota === "base1_base2");
    if (!temRomaneioB1B2) {
      return { tipo: "aguarda_romaneio_b1b2", label: "Aguard. Rom." };
    }
  }

  if (os.status === "enviado_base2") {
    const romB1B2 = romaneios.find((r) => r.tipo_rota === "base1_base2");
    if (romB1B2 && !romB1B2.data_recebimento && romB1B2.status !== "entregue" && romB1B2.status !== "recebido") {
      return { tipo: "aguarda_conferencia_b2", label: "Aguarda conferência B2" };
    }
  }

  return null;
}
