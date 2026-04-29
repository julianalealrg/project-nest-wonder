import { STATUS_LABELS } from "./statusTransitions";

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatDuracao(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < MIN_MS) return "<1min";
  if (ms < HOUR_MS) {
    const min = Math.round(ms / MIN_MS);
    return `${min}min`;
  }
  if (ms < DAY_MS) {
    const h = Math.floor(ms / HOUR_MS);
    const min = Math.round((ms - h * HOUR_MS) / MIN_MS);
    return min > 0 ? `${h}h ${min}min` : `${h}h`;
  }
  const d = Math.floor(ms / DAY_MS);
  const h = Math.round((ms - d * DAY_MS) / HOUR_MS);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function formatDuracaoCurta(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < HOUR_MS) {
    const min = Math.max(1, Math.round(ms / MIN_MS));
    return `${min}min`;
  }
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`;
  return `${Math.floor(ms / DAY_MS)}d`;
}

export type NivelTempo = "normal" | "amarelo" | "vermelho";

// Heurística (sem SLA configurado por etapa): > 48h vermelho, > 24h amarelo
export function corNivelTempo(ms: number): NivelTempo {
  if (ms >= 2 * DAY_MS) return "vermelho";
  if (ms >= DAY_MS) return "amarelo";
  return "normal";
}

export function tempoEmProducaoMs(os: { data_emissao?: string | null; created_at?: string }): number {
  const ref = os.data_emissao || os.created_at;
  if (!ref) return 0;
  return Date.now() - new Date(ref).getTime();
}

// Linha do tempo derivada dos activity_logs: agrupa em etapas com entrada/saída/duração
export interface LogMudancaStatus {
  id: string;
  created_at: string;
  user_name: string | null;
  details: any;
}

export interface EtapaTimeline {
  status: string;
  label: string;
  entrouEm: string;
  saiuEm: string | null;
  duracaoMs: number;
  responsavel: string | null;
  motivo: string | null;
  estado: "concluida" | "atual" | "pendente";
}

const ORDEM_PADRAO = [
  "aguardando_material",
  "fila_corte",
  "cortando",
  "enviado_base2",
  "acabamento",
  "cq",
  "expedicao",
  "entregue",
];

interface BuildOpts {
  osStatusAtual: string;
  osCriadoEm: string | null;
  // logs cronológicos asc com action="mudanca_status"
  logsStatus: LogMudancaStatus[];
}

/**
 * Monta linha do tempo da OS combinando:
 *   1) O caminho histórico real (via activity_logs com mudanca_status)
 *   2) O caminho restante padrão (etapas que ainda não aconteceram)
 *
 * Etapas atípicas (terceiros, terceiros_recusado, retornos) entram quando
 * aparecem no histórico, mas não contam como pendentes.
 */
export function montarLinhaDoTempo({
  osStatusAtual,
  osCriadoEm,
  logsStatus,
}: BuildOpts): EtapaTimeline[] {
  const ordenados = [...logsStatus].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const etapas: EtapaTimeline[] = [];

  // Inferir status inicial: primeiro from_status do primeiro log, ou aguardando_material como fallback
  const statusInicial =
    (ordenados[0]?.details?.from_status as string | undefined) || "aguardando_material";
  let cursorStatus = statusInicial;
  let cursorEntrouEm = osCriadoEm || (ordenados[0]?.created_at ?? new Date().toISOString());
  let cursorResponsavel: string | null = null;

  for (const log of ordenados) {
    const to = log.details?.to_status as string | undefined;
    if (!to) continue;
    const saiuEm = log.created_at;
    const duracaoMs = new Date(saiuEm).getTime() - new Date(cursorEntrouEm).getTime();
    etapas.push({
      status: cursorStatus,
      label: STATUS_LABELS[cursorStatus] || cursorStatus,
      entrouEm: cursorEntrouEm,
      saiuEm,
      duracaoMs: Math.max(0, duracaoMs),
      responsavel: cursorResponsavel,
      motivo: null,
      estado: "concluida",
    });
    cursorStatus = to;
    cursorEntrouEm = saiuEm;
    cursorResponsavel = log.user_name;
  }

  // Etapa atual (em andamento) — aberta
  const duracaoAtual = Date.now() - new Date(cursorEntrouEm).getTime();
  etapas.push({
    status: cursorStatus,
    label: STATUS_LABELS[cursorStatus] || cursorStatus,
    entrouEm: cursorEntrouEm,
    saiuEm: null,
    duracaoMs: Math.max(0, duracaoAtual),
    responsavel: cursorResponsavel,
    motivo: null,
    estado: osStatusAtual === "entregue" ? "concluida" : "atual",
  });

  // Etapas futuras pendentes (só pra OS no fluxo padrão)
  const idxAtualPadrao = ORDEM_PADRAO.indexOf(cursorStatus);
  if (idxAtualPadrao >= 0 && cursorStatus !== "entregue") {
    for (let i = idxAtualPadrao + 1; i < ORDEM_PADRAO.length; i++) {
      const st = ORDEM_PADRAO[i];
      etapas.push({
        status: st,
        label: STATUS_LABELS[st] || st,
        entrouEm: "",
        saiuEm: null,
        duracaoMs: 0,
        responsavel: null,
        motivo: null,
        estado: "pendente",
      });
    }
  }

  return etapas;
}
