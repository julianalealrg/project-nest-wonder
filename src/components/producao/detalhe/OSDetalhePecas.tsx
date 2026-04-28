import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Minus, Play, X } from "lucide-react";
import { MockOS, MockPeca } from "@/data/mockProducao";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { advancePecaStation } from "@/lib/advancePeca";
import { podeAvancarPecaPara } from "@/lib/pecaStationGuards";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { PecaAdvanceDialog, getNextStation } from "../PecaAdvanceDialog";
import { PecaBatchAdvanceDialog } from "../PecaBatchAdvanceDialog";
import { BlockedTransitionDialog } from "../BlockedTransitionDialog";

type StationKey = "corte" | "45" | "poliborda" | "usinagem" | "acabamento" | "cq";

const STATION_CHIP_LABELS: Record<StationKey, string> = {
  corte: "Corte", "45": "45°", poliborda: "Poli", usinagem: "Usi", acabamento: "Acab", cq: "CQ",
};
const STATION_FULL_LABELS: Record<StationKey, string> = {
  corte: "Corte", "45": "45°", poliborda: "Poliborda", usinagem: "Usinagem", acabamento: "Acabamento", cq: "CQ",
};
const STATION_LABELS_SHORT: Record<string, string> = {
  corte: "Corte", "45": "45°", poliborda: "Poliborda", usinagem: "Usinagem", acabamento: "Acabamento", cq: "CQ",
};

function statusLabel(status: string): string {
  if (status === "concluido" || status === "aprovado") return "Concluído";
  if (status === "em_andamento") return "Em andamento";
  if (status === "reprovado") return "Reprovado";
  if (status === "nao_aplicavel") return "Não aplicável";
  return "Pendente";
}

function StationChip({ station, status, operador }: { station: StationKey; status: string; operador?: string | null }) {
  const label = STATION_CHIP_LABELS[station];
  const fullLabel = STATION_FULL_LABELS[station];
  const sLabel = statusLabel(status);

  let cls = "";
  let icon: React.ReactNode = <Minus className="h-2.5 w-2.5" />;

  if (status === "concluido" || status === "aprovado") {
    cls = "bg-[#DCFCE7] text-[#166534]";
    icon = <Check className="h-2.5 w-2.5" strokeWidth={3} />;
  } else if (status === "em_andamento") {
    cls = "bg-[#FEF9C3] text-[#854D0E]";
    icon = <Clock className="h-2.5 w-2.5" />;
  } else if (status === "reprovado") {
    cls = "bg-[#FEE2E2] text-[#991B1B]";
    icon = <X className="h-2.5 w-2.5" strokeWidth={3} />;
  } else if (status === "nao_aplicavel") {
    cls = "bg-muted text-muted-foreground opacity-40";
    icon = <span className="text-[10px] leading-none">—</span>;
  } else {
    cls = "bg-muted/60 text-[#6B7280]";
  }

  const tooltipText = operador && (status === "concluido" || status === "aprovado")
    ? `${fullLabel} — ${sLabel} por ${operador}`
    : `${fullLabel} — ${sLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium leading-none ${cls}`}>
          {icon}
          {status === "nao_aplicavel" ? "—" : label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

interface Props {
  os: MockOS;
  onStatusChanged?: () => void;
}

export function OSDetalhePecas({ os, onStatusChanged }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pecaDialogOpen, setPecaDialogOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<MockPeca | null>(null);
  const [selectedPecaIds, setSelectedPecaIds] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; title: string; reason: string }>({
    open: false, title: "", reason: "",
  });

  useEffect(() => { setSelectedPecaIds(new Set()); }, [os.id]);

  const selectablePecas = useMemo(() => os.pecas.filter((p) => getNextStation(p) !== null), [os]);
  const selectedPecas = useMemo(() => os.pecas.filter((p) => selectedPecaIds.has(p.id)), [os, selectedPecaIds]);
  const batchInfo = useMemo(() => {
    if (selectedPecas.length === 0) {
      return { station: null as ReturnType<typeof getNextStation>, mismatch: false, guard: { permitido: true } as { permitido: boolean; motivo?: string } };
    }
    const stations = selectedPecas.map((p) => getNextStation(p));
    const first = stations[0];
    const mismatch = stations.some((s) => s !== first);
    if (mismatch || !first) return { station: first, mismatch: true, guard: { permitido: true } };
    const guard = podeAvancarPecaPara(first, os.status, (os as any).romaneios, os.pecas as any);
    return { station: first, mismatch: false, guard };
  }, [selectedPecas, os]);

  const allSelected = selectablePecas.length > 0 && selectablePecas.every((p) => selectedPecaIds.has(p.id));

  function togglePeca(pecaId: string) {
    setSelectedPecaIds((prev) => {
      const next = new Set(prev);
      if (next.has(pecaId)) next.delete(pecaId); else next.add(pecaId);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) setSelectedPecaIds(new Set());
    else setSelectedPecaIds(new Set(selectablePecas.map((p) => p.id)));
  }
  function clearSelection() { setSelectedPecaIds(new Set()); }

  async function handleBatchConfirm(fields: Record<string, string>) {
    if (!batchInfo.station || selectedPecas.length === 0) return;
    setLoading(true);
    let success = 0, failed = 0;
    try {
      for (const peca of selectedPecas) {
        try {
          await advancePecaStation({
            pecaId: peca.id, osId: os.id, osCodigo: os.codigo, pecaItem: peca.item,
            station: batchInfo.station!, fields, userName: profile?.nome || "Sistema", osStatus: os.status,
          });
          success++;
        } catch { failed++; }
      }
      const stationLabel = STATION_LABELS_SHORT[batchInfo.station] || batchInfo.station;
      if (failed === 0) {
        toast({ title: `${success} peça(s) avançada(s) para ${stationLabel}` });
      } else {
        toast({
          title: "Avanço em lote concluído",
          description: `${success} sucesso, ${failed} falha(s).`,
          variant: failed === selectedPecas.length ? "destructive" : "default",
        });
      }
      setBatchOpen(false);
      clearSelection();
      onStatusChanged?.();
    } finally { setLoading(false); }
  }

  function handlePecaAdvance(peca: MockPeca) {
    const next = getNextStation(peca);
    if (!next) return;
    const guard = podeAvancarPecaPara(next, os.status, (os as any).romaneios, os.pecas as any, peca.id);
    if (!guard.permitido) {
      setBlockedDialog({
        open: true,
        title: `Etapa ${STATION_LABELS_SHORT[next]} bloqueada`,
        reason: guard.motivo || "Avanço bloqueado pelo status atual da OS.",
      });
      return;
    }
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
        pecaId: selectedPeca.id, osId: os.id, osCodigo: os.codigo, pecaItem: selectedPeca.item,
        station, fields, userName: profile?.nome || "Sistema", osStatus: os.status,
      });
      toast({ title: `Peça ${selectedPeca.item}: ${STATION_LABELS_SHORT[station]} concluído` });
      setPecaDialogOpen(false);
      setSelectedPeca(null);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao avançar peça", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Peças ({os.pecas.filter((p) => p.status_cq === "aprovado").length}/{os.pecas.length})
        </h3>
        {selectablePecas.length > 0 && (
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            Selecionar todas
          </label>
        )}
      </div>

      {selectedPecas.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/60 p-2.5 flex-wrap">
          <span className="text-[12px] font-medium text-foreground">
            {selectedPecas.length} peça{selectedPecas.length > 1 ? "s" : ""} selecionada{selectedPecas.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {batchInfo.mismatch && (
              <span className="text-[10.5px] text-muted-foreground max-w-[220px] text-right leading-tight">
                Selecione apenas peças na mesma etapa para avançar em lote.
              </span>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm" className="h-7 px-2 text-[11px]"
                      disabled={batchInfo.mismatch || !batchInfo.station || !batchInfo.guard.permitido || loading}
                      onClick={() => setBatchOpen(true)}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Avançar {batchInfo.station ? STATION_LABELS_SHORT[batchInfo.station] : ""}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!batchInfo.guard.permitido && batchInfo.guard.motivo && (
                  <TooltipContent side="left" className="max-w-[260px] text-xs">{batchInfo.guard.motivo}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={clearSelection}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {os.pecas.map((peca) => {
          const nextStation = getNextStation(peca);
          const guard = nextStation ? podeAvancarPecaPara(nextStation, os.status, (os as any).romaneios, os.pecas as any, peca.id) : { permitido: true };
          const isSelectable = nextStation !== null;
          const isSelected = selectedPecaIds.has(peca.id);
          const temFotosCabine = !!(peca.foto_insumos_url || peca.foto_acabador_assinado_url);
          return (
            <div
              key={peca.id}
              className={`rounded-md transition-colors ${
                isSelected ? "bg-muted/70 ring-1 ring-border" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3 p-3 flex-wrap">
                <Checkbox
                  checked={isSelected} disabled={!isSelectable}
                  onCheckedChange={() => togglePeca(peca.id)}
                  aria-label={`Selecionar peça ${peca.item}`}
                />
                <span className="w-8 text-center text-[13px] font-medium text-foreground">{peca.item}</span>
                <span className="flex-1 min-w-[140px] truncate text-[13px] text-foreground">{peca.descricao}</span>
                <TooltipProvider delayDuration={150}>
                  <div className="flex flex-wrap items-center gap-1">
                    <StationChip station="corte" status={peca.status_corte} operador={peca.cortador} />
                    {peca.precisa_45 && <StationChip station="45" status={peca.status_45} operador={peca.operador_45} />}
                    {peca.precisa_poliborda && <StationChip station="poliborda" status={peca.status_poliborda} operador={peca.operador_poliborda} />}
                    {peca.precisa_usinagem && <StationChip station="usinagem" status={peca.status_usinagem} operador={peca.operador_usinagem} />}
                    <StationChip station="acabamento" status={peca.status_acabamento} operador={peca.acabador} />
                    <StationChip station="cq" status={peca.status_cq} operador={peca.cq_responsavel} />
                  </div>
                </TooltipProvider>
                {nextStation && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline" size="sm" className="h-7 px-2 text-[11px]"
                            onClick={() => handlePecaAdvance(peca)} disabled={!guard.permitido}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            {STATION_LABELS_SHORT[nextStation]}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!guard.permitido && guard.motivo && (
                        <TooltipContent side="left" className="max-w-[260px] text-xs">{guard.motivo}</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {temFotosCabine && (
                <div className="flex items-center gap-2 border-t px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cabine</span>
                  {peca.foto_insumos_url && (
                    <a href={peca.foto_insumos_url} target="_blank" rel="noopener noreferrer">
                      <img src={peca.foto_insumos_url} alt="Insumos" className="h-10 w-10 object-cover rounded border" title="Insumos" />
                    </a>
                  )}
                  {peca.foto_acabador_assinado_url && (
                    <a href={peca.foto_acabador_assinado_url} target="_blank" rel="noopener noreferrer">
                      <img src={peca.foto_acabador_assinado_url} alt="Doc acabador" className="h-10 w-10 object-cover rounded border" title="Doc do acabador" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PecaAdvanceDialog
        open={pecaDialogOpen} onOpenChange={setPecaDialogOpen}
        peca={selectedPeca} station={selectedPeca ? getNextStation(selectedPeca) : null}
        loading={loading} onConfirm={handlePecaConfirm}
        irmas={selectedPeca ? (os.pecas.filter((p) => p.id !== selectedPeca.id) as any) : (os.pecas as any)}
      />
      <PecaBatchAdvanceDialog
        open={batchOpen} onOpenChange={setBatchOpen}
        station={batchInfo.station ?? null} count={selectedPecas.length}
        loading={loading} onConfirm={handleBatchConfirm}
        irmas={(os.pecas.filter((p) => !selectedPecaIds.has(p.id))) as any}
      />
      <BlockedTransitionDialog
        open={blockedDialog.open}
        onOpenChange={(o) => setBlockedDialog((s) => ({ ...s, open: o }))}
        title={blockedDialog.title} reason={blockedDialog.reason}
      />
    </div>
  );
}
