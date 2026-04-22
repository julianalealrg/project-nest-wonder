import { useState, useMemo } from "react";
import { X, FileText, ChevronRight, Loader2, Play, ExternalLink } from "lucide-react";
import { gerarPDFOS } from "@/lib/pdfOS";
import { MockOS, MockPeca, STATUS_STEPS, STATUS_MAP, STATUS_LABELS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getNextStatuses, STATUS_LABELS as TRANSITION_LABELS } from "@/lib/statusTransitions";
import { changeOSStatus } from "@/lib/changeOSStatus";
import { advancePecaStation } from "@/lib/advancePeca";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { PecaAdvanceDialog, getNextStation } from "./PecaAdvanceDialog";

interface OSPanelProps {
  os: MockOS | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

function StationBadge({ status }: { status: string }) {
  if (status === "concluido" || status === "aprovado")
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground" title="Concluído" />;
  if (status === "em_andamento")
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" title="Em andamento" />;
  if (status === "reprovado")
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" title="Reprovado" />;
  if (status === "nao_aplicavel")
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted" title="N/A" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full border border-border" title="Pendente" />;
}

function ProgressBar({ status }: { status: string }) {
  const idx = STATUS_MAP[status];
  const total = STATUS_STEPS.length;
  const current = idx !== undefined ? idx + 1 : 0;
  const pct = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{STATUS_LABELS[status] || status}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-[10px] bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step}
            className={`text-[10px] text-center leading-tight ${
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

const STATION_LABELS_SHORT: Record<string, string> = {
  corte: "Corte", "45": "45°", poliborda: "Poliborda",
  usinagem: "Usinagem", acabamento: "Acabamento", cq: "CQ",
};

export function OSPanel({ os, onClose, onStatusChanged }: OSPanelProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [pecaDialogOpen, setPecaDialogOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<MockPeca | null>(null);
  const { profile } = useAuth();

  // Check if all pieces completed a station - show suggestion
  const allPiecesCompletedStation = useMemo(() => {
    if (!os) return null;
    const pecas = os.pecas;
    if (pecas.length === 0) return null;

    // Check if all corte done
    if (pecas.every(p => p.status_corte === "concluido") && os.status === "cortando") {
      return "Todas as peças concluíram o Corte.";
    }
    // Check if all acabamento done
    if (pecas.every(p => p.status_acabamento === "concluido") && os.status === "acabamento") {
      return "Todas as peças concluíram o Acabamento.";
    }
    // Check if all CQ approved
    if (pecas.every(p => p.status_cq === "aprovado") && os.status === "cq") {
      return "Todas as peças foram aprovadas no CQ.";
    }
    return null;
  }, [os]);

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

  function handlePecaAdvance(peca: MockPeca) {
    const next = getNextStation(peca);
    if (!next) return;
    setSelectedPeca(peca);
    setPecaDialogOpen(true);
  }

  async function handlePecaConfirm(fields: Record<string, string>) {
    if (!selectedPeca || !os) return;
    const station = getNextStation(selectedPeca);
    if (!station) return;
    setLoading(true);
    try {
      await advancePecaStation({
        pecaId: selectedPeca.id,
        osId: os.id,
        osCodigo: os.codigo,
        pecaItem: selectedPeca.item,
        station,
        fields,
        userName: profile?.nome || "Sistema",
      });
      toast({ title: `Peça ${selectedPeca.item}: ${STATION_LABELS_SHORT[station]} concluído` });
      setPecaDialogOpen(false);
      setSelectedPeca(null);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao avançar peça", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[700px] bg-card border-l z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-foreground">{os.codigo}</h2>
            <p className="text-[13px] text-muted-foreground">{os.cliente}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Material", value: os.material },
                { label: "Ambiente", value: os.ambiente },
                { label: "Supervisor", value: os.supervisor },
                { label: "Projetista", value: os.projetista },
                { label: "Área", value: `${os.area_m2} m²` },
                { label: "Localização", value: os.localizacao },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <p className="text-[14px] text-foreground font-medium">{value}</p>
                </div>
              ))}
              {os.terceiro && (
                <div className="col-span-2">
                  <span className="text-[11px] text-muted-foreground">Terceiro</span>
                  <p className="text-[14px] text-foreground">{os.terceiro}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Status + progress */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <Badge variant="outline">{STATUS_LABELS[os.status] || os.status}</Badge>
              </div>
              <ProgressBar status={os.status} />
            </div>

            {/* Suggestion banner */}
            {allPiecesCompletedStation && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-[13px] text-foreground">
                ✅ {allPiecesCompletedStation} Deseja avançar o status da OS?
              </div>
            )}

            <Separator />

            {/* Peças */}
            <div>
              <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Peças ({os.pecas.filter((p) => p.status_cq === "aprovado").length}/{os.pecas.length})
              </h3>
              <div className="space-y-2">
                {os.pecas.map((peca) => {
                  const nextStation = getNextStation(peca);
                  return (
                    <div key={peca.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                      <span className="font-medium text-foreground w-8 text-center text-[13px]">{peca.item}</span>
                      <span className="flex-1 text-foreground truncate text-[13px]">{peca.descricao}</span>
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
                      {nextStation && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handlePecaAdvance(peca)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {STATION_LABELS_SHORT[nextStation]}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground" /> Concl.</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" /> Andamento</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" /> Reprovado</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full border border-border" /> Pendente</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-muted" /> N/A</span>
              </div>
            </div>

            {/* PDF Importado */}
            {os.pdf_url && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      PDF da OS
                    </h3>
                    <a
                      href={os.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-foreground hover:underline flex items-center gap-1"
                    >
                      Abrir em nova aba <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="rounded-md border border-border overflow-hidden bg-muted/30">
                    <iframe
                      src={`${os.pdf_url}#toolbar=0&navpanes=0`}
                      title="PDF da OS"
                      className="w-full h-[480px] block"
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Se o PDF não aparecer acima,{" "}
                    <a href={os.pdf_url} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
                      clique aqui para abrir em nova aba
                    </a>
                    .
                  </div>
                </div>
              </>
            )}

            {/* Romaneios */}
            {os.romaneios.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Romaneios ({os.romaneios.length})
                  </h3>
                  <div className="space-y-2">
                    {os.romaneios.map((rom) => (
                      <div key={rom.codigo} className="flex items-center justify-between p-3 rounded-md bg-muted/30 text-[13px]">
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
                  <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Registros ({os.registros.length})
                  </h3>
                  <div className="space-y-2">
                    {os.registros.map((reg) => (
                      <div key={reg.codigo} className="flex items-center justify-between p-3 rounded-md bg-muted/30 text-[13px]">
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
        <div className="border-t px-6 py-4 flex gap-2">
          <Button variant="outline" className="flex-1 py-3 px-6 text-[13px]" onClick={() => gerarPDFOS(os)}>
            <FileText className="h-4 w-4 mr-1" />
            Gerar PDF
          </Button>
          {nextStatuses.map((ns) => (
            <Button
              key={ns}
              className="flex-1 py-3 px-6 text-[13px]"
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

      <PecaAdvanceDialog
        open={pecaDialogOpen}
        onOpenChange={setPecaDialogOpen}
        peca={selectedPeca}
        station={selectedPeca ? getNextStation(selectedPeca) : null}
        loading={loading}
        onConfirm={handlePecaConfirm}
      />
    </>
  );
}
