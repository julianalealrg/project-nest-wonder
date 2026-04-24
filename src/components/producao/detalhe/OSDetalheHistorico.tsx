import { useQuery } from "@tanstack/react-query";
import { Loader2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  osId: string;
}

interface LogEntry {
  id: string;
  action: string;
  user_name: string | null;
  details: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  os_criada: "OS criada",
  status_changed: "Status alterado",
  peca_avancada: "Peça avançada",
  cq_reprovado: "CQ reprovado",
  pdf_gerado: "PDF gerado",
  romaneio_vinculado: "Romaneio vinculado",
};

function formatDetails(action: string, details: any): string {
  if (!details) return "";
  if (action === "status_changed" && details.from_status && details.to_status) {
    return `${details.from_status} → ${details.to_status}`;
  }
  if (action === "peca_avancada" && details.station) {
    return `Estação: ${details.station}${details.peca_item ? ` • Peça ${details.peca_item}` : ""}`;
  }
  if (action === "cq_reprovado") {
    return `${details.pecas_reprovadas || 0} peça(s) reprovada(s)${details.motivo ? ` — ${details.motivo}` : ""}`;
  }
  return "";
}

export function OSDetalheHistorico({ osId }: Props) {
  const { data: logs = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: ["activity_logs", "ordens_servico", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, user_name, details, created_at")
        .eq("entity_type", "ordens_servico")
        .eq("entity_id", osId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as LogEntry[]) || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando histórico...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-8 text-center">
        <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada para esta OS.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Histórico ({logs.length})
      </h3>
      <ol className="relative space-y-3 border-l border-border pl-5">
        {logs.map((log) => {
          const dt = new Date(log.created_at);
          const detailsText = formatDetails(log.action, log.details);
          return (
            <li key={log.id} className="relative">
              <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-foreground" />
              <div className="rounded-md border bg-card p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">
                      {ACTION_LABELS[log.action] || log.action}
                    </p>
                    {detailsText && (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{detailsText}</p>
                    )}
                    {log.user_name && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">por {log.user_name}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {dt.toLocaleDateString("pt-BR")} {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
