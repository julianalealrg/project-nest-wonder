import { useMemo, useState } from "react";
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
import { evaluateTransition, type GuardAction } from "@/lib/statusGuards";
import { BlockedTransitionDialog } from "./BlockedTransitionDialog";
import { TerceiroSelectDialog } from "./TerceiroSelectDialog";
import { NovoRomaneioDialog } from "@/components/logistica/NovoRomaneioDialog";

interface OSPanelProps {
  os: MockOS | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

function StationBadge({ status }: { status: string }) {
  if (status === "concluido" || status === "aprovado") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" title="Concluído" />;
  }
  if (status === "em_andamento") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning animate-pulse" title="Em andamento" />;
  }
  if (status === "reprovado") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" title="Reprovado" />;
  }
  if (status === "nao_aplicavel") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" title="N/A" />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" title="Pendente" />;
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
      <div className="h-[10px] overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step}
            className={`text-center text-[10px] leading-tight ${
              i <= (idx ?? -1) ? "font-medium text-foreground" : "text-muted-foreground"
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
  corte: "Corte",
  "45": "45°",
  poliborda: "Poliborda",
  usinagem: "Usinagem",
  acabamento: "Acabamento",
  cq: "CQ",
};

export function OSPanel({ os, onClose, onStatusChanged }: OSPanelProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [pecaDialogOpen, setPecaDialogOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<MockPeca | null>(null);
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; title: string; reason: string; details?: string[] }>({
    open: false,
    title: "",
    reason: "",
  });
  const [terceiroOpen, setTerceiroOpen] = useState(false);
  const [romaneioOpen, setRomaneioOpen] = useState(false);
  const [romaneioPreset, setRomaneioPreset] = useState<{ tipoRota: string; osId: string } | null>(null);
  const { profile } = useAuth();

  const allPiecesCompletedStation = useMemo(() => {
    if (!os) return null;
    const pecas = os.pecas;
    if (pecas.length === 0) return null;

    if (pecas.every((p) => p.status_corte === "concluido") && os.status === "cortando") {
      return "Todas as peças concluíram o Corte.";
    }
    if (pecas.every((p) => p.status_acabamento === "concluido") && os.status === "acabamento") {
      return "Todas as peças concluíram o Acabamento.";
    }
    if (pecas.every((p) => p.status_cq === "aprovado") && os.status === "cq") {
      return "Todas as peças foram aprovadas no CQ.";
    }
    return null;
  }, [os]);

  if (!os) return null;

  const nextStatuses = getNextStatuses(os.status);

  function handleSelect(newStatus: string) {
    if (!os) return;
    const guard: GuardAction = evaluateTransition(os, newStatus);

    if (guard.kind === "blocked") {
      setBlockedDialog({ open: true, title: guard.title, reason: guard.reason, details: guard.details });
      return;
    }
    if (guard.kind === "open_romaneio") {
      setRomaneioPreset({ tipoRota: guard.tipoRota, osId: guard.presetOsId });
      setRomaneioOpen(true);
      // Avança o status da OS automaticamente; o usuário continua criando o romaneio
      doChangeStatus(newStatus, {});
      return;
    }
    if (guard.kind === "select_terceiro") {
      setPendingStatus(newStatus);
      setTerceiroOpen(true);
      return;
    }

    setPendingStatus(newStatus);
    setDialogOpen(true);
  }

  async function doChangeStatus(newStatus: string, extraFields: Record<string, string>) {
    if (!os) return;
    setLoading(true);
    try {
      await changeOSStatus({
        osId: os.id,
        osCodigo: os.codigo,
        fromStatus: os.status,
        toStatus: newStatus,
        userName: profile?.nome || "Sistema",
        extraFields,
      });
      toast({ title: `${os.codigo}: ${TRANSITION_LABELS[newStatus]}` });
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao mudar status", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(extraFields: Record<string, string>) {
    await doChangeStatus(pendingStatus, extraFields);
    setDialogOpen(false);
  }

  async function handleTerceiroConfirm(terceiroNome: string) {
    await doChangeStatus(pendingStatus, { terceiro: terceiroNome });
    // Persistir terceiro_nome na OS
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("ordens_servico").update({ terceiro_nome: terceiroNome } as any).eq("id", os!.id);
    } catch (e) {
      // ignore - já logado
    }
    setTerceiroOpen(false);
  }

  function handlePecaAdvance(peca: MockPeca) {
    const next = getNextStation(peca);
    if (!next) return;
    setSelectedPeca(peca);
    setPecaDialogOpen(true);
  }

  async function handlePecaConfirm(fields: Record<string, string>) {
    if (!selectedPeca) return;
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
      <div className="fixed inset-0 z-40 bg-foreground/20" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[700px] animate-slide-in-right flex-col border-l bg-card">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">{os.codigo}</h2>
            <p className="text-[13px] text-muted-foreground">{os.cliente}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-6">
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
                  <p className="text-[14px] font-medium text-foreground">{value}</p>
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

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                <Badge variant="outline">{STATUS_LABELS[os.status] || os.status}</Badge>
              </div>
              <ProgressBar status={os.status} />
            </div>

            {allPiecesCompletedStation && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-[13px] text-foreground">
                ✅ {allPiecesCompletedStation} Deseja avançar o status da OS?
              </div>
            )}

            <Separator />

            <div>
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Peças ({os.pecas.filter((p) => p.status_cq === "aprovado").length}/{os.pecas.length})
              </h3>
              <div className="space-y-2">
                {os.pecas.map((peca) => {
                  const nextStation = getNextStation(peca);
                  return (
                    <div key={peca.id} className="flex items-center gap-3 rounded-md bg-muted/30 p-3">
                      <span className="w-8 text-center text-[13px] font-medium text-foreground">{peca.item}</span>
                      <span className="flex-1 truncate text-[13px] text-foreground">{peca.descricao}</span>
                      <div className="flex items-center gap-1.5" title="Corte | 45° | Poliborda | Usinagem | Acabamento | CQ">
                        <StationBadge status={peca.status_corte} />
                        <StationBadge status={peca.status_45} />
                        <StationBadge status={peca.status_poliborda} />
                        <StationBadge status={peca.status_usinagem} />
                        <StationBadge status={peca.status_acabamento} />
                        <StationBadge status={peca.status_cq} />
                      </div>
                      {peca.cortador && <span className="text-[10px] text-muted-foreground">{peca.cortador}</span>}
                      {nextStation && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handlePecaAdvance(peca)}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          {STATION_LABELS_SHORT[nextStation]}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" /> Concl.
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning" /> Andamento
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" /> Reprovado
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" /> Pendente
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" /> N/A
                </span>
              </div>
            </div>

            <Separator />
            <div>
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                PDF da OS
              </h3>
              {os.pdf_url ? (
                <a
                  href={os.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px] text-foreground hover:bg-muted/40 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Ver PDF da OS
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ) : (
                <p className="text-[12px] text-muted-foreground">Nenhum PDF anexado</p>
              )}
            </div>

            {os.romaneios.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Romaneios ({os.romaneios.length})
                  </h3>
                  <div className="space-y-2">
                    {os.romaneios.map((rom) => (
                      <div
                        key={rom.codigo}
                        className="flex items-center justify-between rounded-md bg-muted/30 p-3 text-[13px]"
                      >
                        <span className="font-medium text-foreground">{rom.codigo}</span>
                        <Badge variant="outline" className="text-xs">
                          {rom.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {os.registros.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Registros ({os.registros.length})
                  </h3>
                  <div className="space-y-2">
                    {os.registros.map((reg) => (
                      <div
                        key={reg.codigo}
                        className="flex items-center justify-between rounded-md bg-muted/30 p-3 text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{reg.codigo}</span>
                          {reg.urgencia === "alta" && (
                            <span className="text-[10px] font-medium text-destructive">URGENTE</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {reg.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 border-t px-6 py-4">
          <Button variant="outline" className="flex-1 px-6 py-3 text-[13px]" onClick={() => gerarPDFOS(os)}>
            <FileText className="mr-1 h-4 w-4" />
            Gerar PDF
          </Button>
          {nextStatuses.map((ns) => (
            <Button
              key={ns}
              className="flex-1 px-6 py-3 text-[13px]"
              disabled={loading}
              onClick={() => handleSelect(ns)}
            >
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {TRANSITION_LABELS[ns]}
              <ChevronRight className="ml-1 h-4 w-4" />
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

      <BlockedTransitionDialog
        open={blockedDialog.open}
        onOpenChange={(o) => setBlockedDialog((s) => ({ ...s, open: o }))}
        title={blockedDialog.title}
        reason={blockedDialog.reason}
        details={blockedDialog.details}
      />

      <TerceiroSelectDialog
        open={terceiroOpen}
        onOpenChange={setTerceiroOpen}
        loading={loading}
        onConfirm={handleTerceiroConfirm}
      />

      <NovoRomaneioDialog
        open={romaneioOpen}
        onOpenChange={(o) => {
          setRomaneioOpen(o);
          if (!o) setRomaneioPreset(null);
        }}
        presetTipoRota={romaneioPreset?.tipoRota}
        presetOsId={romaneioPreset?.osId}
        onSuccess={() => onStatusChanged?.()}
      />
    </>
  );
}
