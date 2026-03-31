import { useState } from "react";
import { X, FileText, ChevronRight, Loader2 } from "lucide-react";
import { MockOS, STATUS_STEPS, STATUS_MAP, STATUS_LABELS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getNextStatuses, STATUS_LABELS as TRANSITION_LABELS } from "@/lib/statusTransitions";
import { changeOSStatus } from "@/lib/changeOSStatus";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { StatusChangeDialog } from "./StatusChangeDialog";

interface OSPanelProps {
  os: MockOS | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

function StationBadge({ status }: { status: string }) {
  if (status === "concluido" || status === "aprovado")
    return <span className="inline-block w-2 h-2 rounded-full bg-foreground" title="Concluído" />;
  if (status === "em_andamento")
    return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Em andamento" />;
  if (status === "nao_aplicavel")
    return <span className="inline-block w-2 h-2 rounded-full bg-muted" title="N/A" />;
  return <span className="inline-block w-2 h-2 rounded-full border border-border" title="Pendente" />;
}

function ProgressBar({ status }: { status: string }) {
  const idx = STATUS_MAP[status];
  const total = STATUS_STEPS.length;
  const current = idx !== undefined ? idx + 1 : 0;
  const pct = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{STATUS_LABELS[status] || status}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step}
            className={`text-[9px] text-center leading-tight ${
              i <= (idx ?? -1) ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
            style={{ width: `${100 / total}%` }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OSPanel({ os, onClose, onStatusChanged }: OSPanelProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const { profile } = useAuth();

  if (!os) return null;

  const nextStatuses = getNextStatuses(os.status);

  function handleSelect(newStatus: string) {
    setPendingStatus(newStatus);
    setDialogOpen(true);
  }

  async function handleConfirm(extraFields: Record<string, string>) {
    if (!os) return;
    setLoading(true);
    try {
      await changeOSStatus({
        osId: os.id,
        osCodigo: os.codigo,
        fromStatus: os.status,
        toStatus: pendingStatus,
        userName: profile?.nome || "Sistema",
        extraFields,
      });
      toast({ title: `${os.codigo}: ${TRANSITION_LABELS[pendingStatus]}` });
      setDialogOpen(false);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao mudar status", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[460px] bg-card border-l z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold text-foreground">{os.codigo}</h2>
            <p className="text-sm text-muted-foreground">{os.cliente}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Material</span>
                <p className="text-foreground font-medium">{os.material}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Ambiente</span>
                <p className="text-foreground font-medium">{os.ambiente}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Supervisor</span>
                <p className="text-foreground">{os.supervisor}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Projetista</span>
                <p className="text-foreground">{os.projetista}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Área</span>
                <p className="text-foreground">{os.area_m2} m²</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Localização</span>
                <p className="text-foreground">{os.localizacao}</p>
              </div>
              {os.terceiro && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Terceiro</span>
                  <p className="text-foreground">{os.terceiro}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Status + progress */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <Badge variant="outline">{STATUS_LABELS[os.status] || os.status}</Badge>
              </div>
              <ProgressBar status={os.status} />
            </div>

            <Separator />

            {/* Peças */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Peças ({os.pecas.filter((p) => p.status_cq === "aprovado").length}/{os.pecas.length})
              </h3>
              <div className="space-y-2">
                {os.pecas.map((peca) => (
                  <div key={peca.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30 text-sm">
                    <span className="font-medium text-foreground w-6 text-center">{peca.item}</span>
                    <span className="flex-1 text-foreground truncate">{peca.descricao}</span>
                    <div className="flex items-center gap-1.5" title="Corte | 45° | Poliborda | Usinagem | Acabamento | CQ">
                      <StationBadge status={peca.status_corte} />
                      <StationBadge status={peca.status_45} />
                      <StationBadge status={peca.status_poliborda} />
                      <StationBadge status={peca.status_usinagem} />
                      <StationBadge status={peca.status_acabamento} />
                      <StationBadge status={peca.status_cq} />
                    </div>
                    {peca.cortador && (
                      <span className="text-[10px] text-muted-foreground">{peca.cortador}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-foreground" /> Concl.</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-500" /> Andamento</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full border border-border" /> Pendente</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-muted" /> N/A</span>
              </div>
            </div>

            {/* Romaneios */}
            {os.romaneios.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Romaneios ({os.romaneios.length})
                  </h3>
                  <div className="space-y-2">
                    {os.romaneios.map((rom) => (
                      <div key={rom.codigo} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 text-sm">
                        <span className="font-medium text-foreground">{rom.codigo}</span>
                        <Badge variant="outline" className="text-xs">{rom.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Registros */}
            {os.registros.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Registros ({os.registros.length})
                  </h3>
                  <div className="space-y-2">
                    {os.registros.map((reg) => (
                      <div key={reg.codigo} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{reg.codigo}</span>
                          {reg.urgencia === "alta" && (
                            <span className="text-[10px] text-destructive font-medium">URGENTE</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">{reg.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t px-5 py-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="h-4 w-4 mr-1" />
            Gerar PDF
          </Button>
          {nextStatuses.map((ns) => (
            <Button
              key={ns}
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={() => handleSelect(ns)}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {TRANSITION_LABELS[ns]}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ))}
        </div>
      </div>

      <StatusChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        osCodigo={os.codigo}
        fromStatus={os.status}
        toStatus={pendingStatus}
        loading={loading}
        onConfirm={handleConfirm}
      />
    </>
  );
}
