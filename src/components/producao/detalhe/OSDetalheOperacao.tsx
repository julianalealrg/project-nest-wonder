import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { MockOS } from "@/data/mockProducao";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { OSDetalhePecas } from "./OSDetalhePecas";
import { OSDetalheRomaneios } from "./OSDetalheRomaneios";

interface Props {
  os: MockOS;
  onStatusChanged?: () => void;
}

interface LogEntry {
  id: string;
  action: string;
  user_name: string | null;
  details: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  avanco_automatico_pos_recebimento: "Avanço automático",
  avanco_peca: "Peça avançada",
  cq_reprovado: "CQ reprovado",
  criacao_registro: "Registro criado",
  registro_auto_recebimento: "Ocorrência automática",
  criacao_romaneio: "Romaneio criado",
  despacho_romaneio: "Romaneio despachado",
  romaneio_cancelado: "Romaneio cancelado",
  recebimento_romaneio: "Romaneio recebido",
  mudanca_status: "Status alterado",
  os_gerada_de_registro: "OS gerada do registro",
};

function formatRelative(dt: Date): string {
  const diff = Date.now() - dt.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d atrás`;
  return dt.toLocaleDateString("pt-BR");
}

function formatDetails(action: string, details: any): string {
  if (!details) return "";
  if (action === "mudanca_status" && details.from_status && details.to_status) {
    return `${details.from_status} → ${details.to_status}`;
  }
  if (action === "avanco_peca" && (details.estacao || details.station)) {
    const est = details.estacao || details.station;
    const peca = details.peca_item ? ` · Peça ${details.peca_item}` : "";
    return `${est}${peca}`;
  }
  if (action === "avanco_automatico_pos_recebimento" && details.to_status) {
    return `→ ${details.to_status}`;
  }
  if (action === "despacho_romaneio") {
    return details.tem_foto_carga || details.tem_foto_motorista ? "com fotos" : "";
  }
  if (action === "recebimento_romaneio" && details.pecas_com_problema) {
    return `${details.pecas_com_problema} ocorrência(s) registrada(s)`;
  }
  return "";
}

export function OSDetalheOperacao({ os, onStatusChanged }: Props) {
  const { data: logs = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: ["activity_logs", "ordens_servico", os.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, user_name, details, created_at")
        .eq("entity_type", "ordens_servico")
        .eq("entity_id", os.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data as LogEntry[]) || [];
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Coluna principal: Peças + Romaneios */}
      <div className="space-y-8 lg:col-span-2">
        <section>
          <OSDetalhePecas os={os} onStatusChanged={onStatusChanged} />
        </section>
        <Separator />
        <section>
          <OSDetalheRomaneios os={os} onStatusChanged={onStatusChanged} />
        </section>
      </div>

      {/* Coluna lateral: Timeline cronológica recente */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Atividade recente
          </h3>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center">
            <Activity className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Sem atividade ainda.</p>
          </div>
        ) : (
          <ol className="relative space-y-2 border-l border-border pl-4">
            {logs.map((log) => {
              const dt = new Date(log.created_at);
              const detailsText = formatDetails(log.action, log.details);
              return (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[19px] top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
                  <div className="text-[12px]">
                    <p className="font-medium text-foreground leading-tight">
                      {ACTION_LABELS[log.action] || log.action}
                    </p>
                    {detailsText && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{detailsText}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelative(dt)}{log.user_name ? ` · ${log.user_name}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {logs.length >= 15 && (
          <p className="text-[10px] text-muted-foreground italic">Veja "Histórico" pra atividade completa.</p>
        )}
      </aside>
    </div>
  );
}
