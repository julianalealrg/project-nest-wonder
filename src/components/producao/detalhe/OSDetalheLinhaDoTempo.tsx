import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, Clock, Circle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MockOS } from "@/data/mockProducao";
import {
  montarLinhaDoTempo,
  formatDuracao,
  corNivelTempo,
  type LogMudancaStatus,
  type EtapaTimeline,
} from "@/lib/tempoEstacao";

interface Props {
  os: MockOS;
}

export function OSDetalheLinhaDoTempo({ os }: Props) {
  const { data: logs = [], isLoading } = useQuery<LogMudancaStatus[]>({
    queryKey: ["activity_logs", "ordens_servico", os.id, "mudanca_status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, user_name, details, created_at")
        .eq("entity_type", "ordens_servico")
        .eq("entity_id", os.id)
        .eq("action", "mudanca_status")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as LogMudancaStatus[]) || [];
    },
  });

  const etapas = useMemo(
    () =>
      montarLinhaDoTempo({
        osStatusAtual: os.status,
        osCriadoEm: os.data_emissao || (os as any).created_at || null,
        logsStatus: logs,
      }),
    [os.status, os.data_emissao, (os as any).created_at, logs],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando linha do tempo...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Linha do tempo da OS
      </h3>
      <ol className="space-y-3">
        {etapas.map((etapa, idx) => (
          <EtapaItem key={`${etapa.status}-${idx}`} etapa={etapa} />
        ))}
      </ol>
    </div>
  );
}

function EtapaItem({ etapa }: { etapa: EtapaTimeline }) {
  if (etapa.estado === "pendente") {
    return (
      <li className="flex items-start gap-3 opacity-50">
        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border bg-muted">
          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        <div className="flex-1 pt-0.5">
          <div className="text-sm font-medium text-muted-foreground">{etapa.label}</div>
          <div className="text-[11px] text-muted-foreground italic">Aguardando etapa anterior</div>
        </div>
      </li>
    );
  }

  if (etapa.estado === "atual") {
    const nivel = corNivelTempo(etapa.duracaoMs);
    const corBorda =
      nivel === "vermelho"
        ? "border-nue-vermelho"
        : nivel === "amarelo"
          ? "border-nue-amarelo"
          : "border-nue-laranja";
    const corBg =
      nivel === "vermelho"
        ? "bg-nue-vermelho text-white"
        : nivel === "amarelo"
          ? "bg-nue-amarelo text-nue-chumbo"
          : "bg-nue-laranja text-white";
    return (
      <li className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${corBg}`}
        >
          <Clock className="h-3.5 w-3.5" />
        </span>
        <div className={`flex-1 rounded-md border-l-2 ${corBorda} bg-card p-3`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-foreground uppercase">
              {etapa.label}
            </div>
            {nivel !== "normal" && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  nivel === "vermelho"
                    ? "bg-nue-vermelho text-white"
                    : "bg-nue-amarelo text-nue-chumbo"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                {nivel === "vermelho" ? "Atenção crítica" : "Atenção"}
              </span>
            )}
          </div>
          <div className={`mt-1 text-xs font-medium ${
            nivel === "vermelho"
              ? "text-nue-vermelho"
              : nivel === "amarelo"
                ? "text-nue-amarelo"
                : "text-foreground"
          }`}>
            Em andamento há {formatDuracao(etapa.duracaoMs)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Iniciado em {formatDataHora(etapa.entrouEm)}
            {etapa.responsavel && ` · por ${etapa.responsavel}`}
          </div>
        </div>
      </li>
    );
  }

  // concluida
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-nue-verde text-white">
        <Check className="h-3.5 w-3.5" />
      </span>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-medium text-foreground">{etapa.label}</div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            Duração: {formatDuracao(etapa.duracaoMs)}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDataHora(etapa.entrouEm)} → {etapa.saiuEm ? formatDataHora(etapa.saiuEm) : "—"}
          {etapa.responsavel && ` · por ${etapa.responsavel}`}
        </div>
      </div>
    </li>
  );
}

function formatDataHora(iso: string): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  return `${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
