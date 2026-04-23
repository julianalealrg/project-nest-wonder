import { useEffect, useMemo, useState } from "react";
import { X, FileText, ChevronRight, Loader2, Play, ExternalLink, Check, Clock, Minus, Palette } from "lucide-react";
import { gerarPDFOS } from "@/lib/pdfOS";
import { MockOS, MockPeca, STATUS_STEPS, STATUS_MAP, STATUS_LABELS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getNextStatuses, STATUS_LABELS as TRANSITION_LABELS } from "@/lib/statusTransitions";
import { changeOSStatus } from "@/lib/changeOSStatus";
import { advancePecaStation } from "@/lib/advancePeca";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { PecaAdvanceDialog, getNextStation } from "./PecaAdvanceDialog";
import { PecaBatchAdvanceDialog } from "./PecaBatchAdvanceDialog";
import { CqReprovaDialog } from "./CqReprovaDialog";
import { evaluateTransition, type GuardAction } from "@/lib/statusGuards";
import { podeAvancarPecaPara } from "@/lib/pecaStationGuards";
import { BlockedTransitionDialog } from "./BlockedTransitionDialog";
import { TerceiroSelectDialog } from "./TerceiroSelectDialog";
import { NovoRomaneioDialog } from "@/components/logistica/NovoRomaneioDialog";
import { RomaneioPanel } from "@/components/logistica/RomaneioPanel";
import { useRomaneios } from "@/hooks/useRomaneios";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

// Transições regressivas (rework / reprovação) — devem ter destaque visual de alerta
const REGRESSIVE_TRANSITIONS = new Set<string>(["cq->acabamento"]);
function isRegressive(from: string, to: string) {
  return REGRESSIVE_TRANSITIONS.has(`${from}->${to}`);
}

interface OSPanelProps {
  os: MockOS | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

type StationKey = "corte" | "45" | "poliborda" | "usinagem" | "acabamento" | "cq";

const STATION_CHIP_LABELS: Record<StationKey, string> = {
  corte: "Corte",
  "45": "45°",
  poliborda: "Poli",
  usinagem: "Usi",
  acabamento: "Acab",
  cq: "CQ",
};

const STATION_FULL_LABELS: Record<StationKey, string> = {
  corte: "Corte",
  "45": "45°",
  poliborda: "Poliborda",
  usinagem: "Usinagem",
  acabamento: "Acabamento",
  cq: "CQ",
};

function statusLabel(status: string): string {
  if (status === "concluido" || status === "aprovado") return "Concluído";
  if (status === "em_andamento") return "Em andamento";
  if (status === "reprovado") return "Reprovado";
  if (status === "nao_aplicavel") return "Não aplicável";
  return "Pendente";
}

function StationChip({
  station,
  status,
  operador,
}: {
  station: StationKey;
  status: string;
  operador?: string | null;
}) {
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
    icon = <Minus className="h-2.5 w-2.5" />;
  }

  const tooltipText = operador && (status === "concluido" || status === "aprovado")
    ? `${fullLabel} — ${sLabel} por ${operador}`
    : `${fullLabel} — ${sLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium leading-none ${cls}`}
        >
          {icon}
          {status === "nao_aplicavel" ? "—" : label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
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

/**
 * Calcula o label, estado disabled e tooltip do botão de próximo status,
 * baseado no resultado de `evaluateTransition` para refletir a ação real.
 */
function getBotaoProximoStatus(
  os: MockOS,
  nextStatus: string,
): { label: string; disabled: boolean; tooltip?: string } {
  const guard = evaluateTransition(os, nextStatus);

  // expedicao / terceiros → entregue
  if (
    (os.status === "expedicao" && nextStatus === "entregue") ||
    (os.status === "terceiros" && nextStatus === "entregue")
  ) {
    if (guard.kind === "open_romaneio") return { label: "Gerar romaneio", disabled: false };
    if (guard.kind === "blocked")
      return { label: "Aguardando cliente", disabled: true, tooltip: guard.reason };
    if (guard.kind === "confirm_entrega") return { label: "Confirmar entrega", disabled: false };
  }

  // cortando → enviado_base2 (sempre passa por gerar romaneio B1→B2 quando peças OK)
  if (os.status === "cortando" && nextStatus === "enviado_base2") {
    if (guard.kind === "open_romaneio") return { label: "Gerar romaneio B1→B2", disabled: false };
    if (guard.kind === "blocked")
      return { label: TRANSITION_LABELS[nextStatus] || nextStatus, disabled: true, tooltip: guard.reason };
  }

  // cortando → terceiros
  if (os.status === "cortando" && nextStatus === "terceiros") {
    if (guard.kind === "select_terceiro") return { label: "Enviar para terceiro", disabled: false };
  }

  // Demais transições: respeita bloqueios genéricos (ex: Acabamento→CQ com peças pendentes)
  if (guard.kind === "blocked") {
    return {
      label: TRANSITION_LABELS[nextStatus] || nextStatus,
      disabled: true,
      tooltip: guard.reason,
    };
  }

  return { label: TRANSITION_LABELS[nextStatus] || nextStatus, disabled: false };
}

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
  const [selectedPecaIds, setSelectedPecaIds] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedRomaneioCodigo, setSelectedRomaneioCodigo] = useState<string | null>(null);
  const [cqReprovaOpen, setCqReprovaOpen] = useState(false);
  const { profile } = useAuth();
  const { data: allRomaneios = [], refetch: refetchRomaneios } = useRomaneios();
  const selectedRomaneio = useMemo(
    () => (selectedRomaneioCodigo ? allRomaneios.find((r) => r.codigo === selectedRomaneioCodigo) ?? null : null),
    [allRomaneios, selectedRomaneioCodigo],
  );

  // Reset seleção quando troca de OS
  useEffect(() => {
    setSelectedPecaIds(new Set());
  }, [os?.id]);

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

  // === Seleção em lote ===
  const selectablePecas = useMemo(
    () => (os ? os.pecas.filter((p) => getNextStation(p) !== null) : []),
    [os],
  );
  const selectedPecas = useMemo(
    () => (os ? os.pecas.filter((p) => selectedPecaIds.has(p.id)) : []),
    [os, selectedPecaIds],
  );
  const batchInfo = useMemo(() => {
    if (!os || selectedPecas.length === 0) {
      return { station: null as ReturnType<typeof getNextStation>, mismatch: false, guard: { permitido: true } as { permitido: boolean; motivo?: string } };
    }
    const stations = selectedPecas.map((p) => getNextStation(p));
    const first = stations[0];
    const mismatch = stations.some((s) => s !== first);
    if (mismatch || !first) return { station: first, mismatch: true, guard: { permitido: true } };
    const guard = podeAvancarPecaPara(first, os.status, (os as any).romaneios);
    return { station: first, mismatch: false, guard };
  }, [selectedPecas, os]);

  if (!os) return null;

  const nextStatuses = getNextStatuses(os.status);
  const allSelected = selectablePecas.length > 0 && selectablePecas.every((p) => selectedPecaIds.has(p.id));

  function togglePeca(pecaId: string) {
    setSelectedPecaIds((prev) => {
      const next = new Set(prev);
      if (next.has(pecaId)) next.delete(pecaId);
      else next.add(pecaId);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelectedPecaIds(new Set());
    else setSelectedPecaIds(new Set(selectablePecas.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedPecaIds(new Set());
  }

  async function handleBatchConfirm(fields: Record<string, string>) {
    if (!os || !batchInfo.station || selectedPecas.length === 0) return;
    setLoading(true);
    let success = 0;
    let failed = 0;
    try {
      for (const peca of selectedPecas) {
        try {
          await advancePecaStation({
            pecaId: peca.id,
            osId: os.id,
            osCodigo: os.codigo,
            pecaItem: peca.item,
            station: batchInfo.station!,
            fields,
            userName: profile?.nome || "Sistema",
            osStatus: os.status,
          });
          success++;
        } catch {
          failed++;
        }
      }
      const stationLabel = STATION_LABELS_SHORT[batchInfo.station] || batchInfo.station;
      if (failed === 0) {
        toast({ title: `${success} peça${success > 1 ? "s" : ""} avançada${success > 1 ? "s" : ""} para ${stationLabel}` });
      } else {
        toast({
          title: "Avanço em lote concluído",
          description: `${success} sucesso, ${failed} falha${failed > 1 ? "s" : ""}.`,
          variant: failed === selectedPecas.length ? "destructive" : "default",
        });
      }
      setBatchOpen(false);
      clearSelection();
      onStatusChanged?.();
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(newStatus: string) {
    if (!os) return;

    // Transição regressiva CQ → Acabamento: abre dialog dedicado de reprovação
    if (isRegressive(os.status, newStatus)) {
      setCqReprovaOpen(true);
      return;
    }

    const guard: GuardAction = evaluateTransition(os, newStatus);

    if (guard.kind === "blocked") {
      setBlockedDialog({ open: true, title: guard.title, reason: guard.reason, details: guard.details });
      return;
    }
    if (guard.kind === "open_romaneio") {
      setRomaneioPreset({ tipoRota: guard.tipoRota, osId: guard.presetOsId });
      setRomaneioOpen(true);
      // Para cortando → enviado_base2, avança o status junto. Para entregas (expedicao/terceiros → entregue),
      // NÃO avança automaticamente: a entrega só é confirmada quando o cliente recebe o romaneio.
      if (os.status === "cortando" && newStatus === "enviado_base2") {
        doChangeStatus(newStatus, {});
      }
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
    const guard = podeAvancarPecaPara(next, os!.status, (os as any).romaneios);
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
        pecaId: selectedPeca.id,
        osId: os.id,
        osCodigo: os.codigo,
        pecaItem: selectedPeca.item,
        station,
        fields,
        userName: profile?.nome || "Sistema",
        osStatus: os.status,
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

  async function handleCqReprovaConfirm(motivo: string, pecaIds: string[]) {
    if (!os || pecaIds.length === 0) return;
    setLoading(true);
    try {
      // 1) Atualiza OS: volta para Acabamento na Base 2
      const { error: osErr } = await supabase
        .from("ordens_servico")
        .update({ status: "acabamento", localizacao: "Base 2", updated_at: new Date().toISOString() } as any)
        .eq("id", os.id);
      if (osErr) throw osErr;

      // 2) Marca peças reprovadas
      const { error: pecasErr } = await supabase
        .from("pecas")
        .update({
          status_cq: "reprovado",
          cq_aprovado: false,
          cq_observacao: motivo,
          status_acabamento: "pendente",
          updated_at: new Date().toISOString(),
        } as any)
        .in("id", pecaIds);
      if (pecasErr) throw pecasErr;

      // 3) Log
      await supabase.from("activity_logs").insert({
        action: "cq_reprovado",
        entity_type: "ordens_servico",
        entity_id: os.id,
        entity_description: os.codigo,
        user_name: profile?.nome || "Sistema",
        details: {
          motivo,
          pecas_reprovadas: pecaIds.length,
          peca_ids: pecaIds,
          from_status: "cq",
          to_status: "acabamento",
        },
      });

      toast({
        title: `${os.codigo} reprovada no CQ`,
        description: `${pecaIds.length} peça${pecaIds.length > 1 ? "s" : ""} retornou para Acabamento.`,
      });
      setCqReprovaOpen(false);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao reprovar", description: err.message, variant: "destructive" });
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-foreground">{os.codigo}</h2>
              {os.registro_origem_aguarda_projetos && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-100 text-purple-700"
                  title={os.registro_origem_codigo ? `Vinculada ao registro ${os.registro_origem_codigo}` : undefined}
                >
                  <Palette className="h-2.5 w-2.5" /> Aguardando Projetos
                </span>
              )}
            </div>
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
                <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/60 p-2.5">
                  <span className="text-[12px] font-medium text-foreground">
                    {selectedPecas.length} peça{selectedPecas.length > 1 ? "s" : ""} selecionada{selectedPecas.length > 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    {batchInfo.mismatch ? (
                      <span className="text-[10.5px] text-muted-foreground max-w-[220px] text-right leading-tight">
                        Selecione apenas peças que estão na mesma etapa para avançar em lote.
                      </span>
                    ) : null}
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              disabled={batchInfo.mismatch || !batchInfo.station || !batchInfo.guard.permitido || loading}
                              onClick={() => setBatchOpen(true)}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Avançar {batchInfo.station ? STATION_LABELS_SHORT[batchInfo.station] : ""}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!batchInfo.guard.permitido && batchInfo.guard.motivo && (
                          <TooltipContent side="left" className="max-w-[260px] text-xs">
                            {batchInfo.guard.motivo}
                          </TooltipContent>
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
                  const guard = nextStation ? podeAvancarPecaPara(nextStation, os.status) : { permitido: true };
                  const isSelectable = nextStation !== null;
                  const isSelected = selectedPecaIds.has(peca.id);
                  return (
                    <div
                      key={peca.id}
                      className={`flex items-center gap-3 rounded-md p-3 transition-colors ${
                        isSelected ? "bg-muted/70 ring-1 ring-border" : "bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={!isSelectable}
                        onCheckedChange={() => togglePeca(peca.id)}
                        aria-label={`Selecionar peça ${peca.item}`}
                      />
                      <span className="w-8 text-center text-[13px] font-medium text-foreground">{peca.item}</span>
                      <span className="flex-1 truncate text-[13px] text-foreground">{peca.descricao}</span>
                      <TooltipProvider delayDuration={150}>
                        <div className="flex flex-wrap items-center gap-1">
                          <StationChip station="corte" status={peca.status_corte} operador={peca.cortador} />
                          {peca.precisa_45 && (
                            <StationChip station="45" status={peca.status_45} operador={peca.operador_45} />
                          )}
                          {peca.precisa_poliborda && (
                            <StationChip station="poliborda" status={peca.status_poliborda} operador={peca.operador_poliborda} />
                          )}
                          {peca.precisa_usinagem && (
                            <StationChip station="usinagem" status={peca.status_usinagem} operador={peca.operador_usinagem} />
                          )}
                          <StationChip station="acabamento" status={peca.status_acabamento} operador={peca.acabador} />
                          <StationChip station="cq" status={peca.status_cq} operador={peca.cq_responsavel} />
                        </div>
                      </TooltipProvider>
                      {peca.cortador && <span className="text-[10px] text-muted-foreground">{peca.cortador}</span>}
                      {nextStation && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => handlePecaAdvance(peca)}
                                  disabled={!guard.permitido}
                                >
                                  <Play className="mr-1 h-3 w-3" />
                                  {STATION_LABELS_SHORT[nextStation]}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!guard.permitido && guard.motivo && (
                              <TooltipContent side="left" className="max-w-[260px] text-xs">
                                {guard.motivo}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  );
                })}
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
                      <button
                        key={rom.codigo}
                        type="button"
                        onClick={() => setSelectedRomaneioCodigo(rom.codigo)}
                        className="flex items-center justify-between w-full rounded-md bg-muted/30 p-3 text-[13px] text-left transition-colors hover:bg-muted/60"
                      >
                        <span className="font-medium text-foreground">{rom.codigo}</span>
                        <Badge variant="outline" className="text-xs">
                          {rom.status}
                        </Badge>
                      </button>
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
          {nextStatuses.map((ns) => {
            const regressive = isRegressive(os.status, ns);
            const btn = regressive
              ? { label: `Reprovar → ${TRANSITION_LABELS[ns]}`, disabled: false, tooltip: undefined as string | undefined }
              : getBotaoProximoStatus(os, ns);
            const buttonNode = (
              <Button
                key={ns}
                variant={regressive ? "outline" : "default"}
                className={
                  regressive
                    ? "flex-1 px-6 py-3 text-[13px] border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                    : "flex-1 px-6 py-3 text-[13px]"
                }
                disabled={loading || btn.disabled}
                onClick={() => handleSelect(ns)}
              >
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {btn.label}
                {!regressive && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            );

            if (btn.tooltip) {
              return (
                <TooltipProvider key={ns}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">{buttonNode}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">{btn.tooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
            return buttonNode;
          })}
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

      <PecaBatchAdvanceDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        station={batchInfo.station ?? null}
        count={selectedPecas.length}
        loading={loading}
        onConfirm={handleBatchConfirm}
      />

      <CqReprovaDialog
        open={cqReprovaOpen}
        onOpenChange={setCqReprovaOpen}
        pecas={os.pecas}
        loading={loading}
        onConfirm={handleCqReprovaConfirm}
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

      {selectedRomaneio && (
        <RomaneioPanel
          romaneio={selectedRomaneio}
          asDialog
          onClose={() => setSelectedRomaneioCodigo(null)}
          onChanged={() => {
            refetchRomaneios();
            onStatusChanged?.();
          }}
        />
      )}
    </>
  );
}
