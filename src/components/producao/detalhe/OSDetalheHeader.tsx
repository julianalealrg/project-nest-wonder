import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, ChevronRight, Loader2, Palette, AlertCircle, Truck, Clock } from "lucide-react";
import { MockOS, STATUS_LABELS } from "@/data/mockProducao";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getNextStatuses, STATUS_LABELS as TRANSITION_LABELS } from "@/lib/statusTransitions";
import { osBadgeClass } from "@/lib/statusColors";
import { evaluateTransition, type GuardAction } from "@/lib/statusGuards";
import { changeOSStatus } from "@/lib/changeOSStatus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { StatusChangeDialog } from "../StatusChangeDialog";
import { BlockedTransitionDialog } from "../BlockedTransitionDialog";
import { TerceiroSelectDialog } from "../TerceiroSelectDialog";
import { CqReprovaDialog } from "../CqReprovaDialog";
import { NovoRomaneioDialog } from "@/components/logistica/NovoRomaneioDialog";
import { getOrigemTagInfo } from "@/lib/origemTag";
import { OSDetalheDetalhes } from "./OSDetalheDetalhes";

const REGRESSIVE_TRANSITIONS = new Set<string>(["cq->acabamento"]);
function isRegressive(from: string, to: string) {
  return REGRESSIVE_TRANSITIONS.has(`${from}->${to}`);
}

function getBotaoProximoStatus(os: MockOS, nextStatus: string): { label: string; disabled: boolean; tooltip?: string } {
  const guard = evaluateTransition(os, nextStatus);
  if ((os.status === "expedicao" && nextStatus === "entregue") || (os.status === "terceiros" && nextStatus === "entregue")) {
    if (guard.kind === "open_romaneio") return { label: "Gerar romaneio", disabled: false };
    if (guard.kind === "blocked") return { label: "Aguardando cliente", disabled: true, tooltip: guard.reason };
    if (guard.kind === "confirm_entrega") return { label: "Confirmar entrega", disabled: false };
  }
  if (os.status === "cortando" && nextStatus === "enviado_base2") {
    if (guard.kind === "open_romaneio") return { label: "Gerar romaneio B1→B2", disabled: false };
    if (guard.kind === "blocked") return { label: TRANSITION_LABELS[nextStatus] || nextStatus, disabled: true, tooltip: guard.reason };
  }
  if (os.status === "cortando" && nextStatus === "terceiros") {
    if (guard.kind === "select_terceiro") return { label: "Enviar para terceiro", disabled: false };
  }
  if (guard.kind === "blocked") return { label: TRANSITION_LABELS[nextStatus] || nextStatus, disabled: true, tooltip: guard.reason };
  return { label: TRANSITION_LABELS[nextStatus] || nextStatus, disabled: false };
}

interface Props {
  os: MockOS;
  onStatusChanged?: () => void;
}

export function OSDetalheHeader({ os, onStatusChanged }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; title: string; reason: string; details?: string[] }>({
    open: false, title: "", reason: "",
  });
  const [terceiroOpen, setTerceiroOpen] = useState(false);
  const [cqReprovaOpen, setCqReprovaOpen] = useState(false);
  const [romaneioOpen, setRomaneioOpen] = useState(false);
  const [romaneioPreset, setRomaneioPreset] = useState<{ tipoRota: string; osId: string } | null>(null);
  const [pendingStatusAfterRomaneio, setPendingStatusAfterRomaneio] = useState<string | null>(null);
  const romaneioSuccessRef = useRef(false);

  const nextStatuses = getNextStatuses(os.status);
  const tag = getOrigemTagInfo(os.origem);

  // Separa ação primária (primeira não-regressiva) das secundárias
  const primaryStatus = nextStatuses.find((ns) => !isRegressive(os.status, ns));
  const secondaryStatuses = nextStatuses.filter((ns) => ns !== primaryStatus);

  const primaryBtn = primaryStatus ? getBotaoProximoStatus(os, primaryStatus) : null;

  // Alertas no header
  const ocorrenciasPendentes = (os.registros || []).filter(
    (r) => r.status !== "resolvido" && !r.acao_produtiva,
  ).length;
  const romaneioEmTransito = (os.romaneios || []).find((r) => r.status === "em_transito");
  const dataEntrega = os.data_entrega ? new Date(os.data_entrega) : null;
  const diasRestantes = dataEntrega ? Math.ceil((dataEntrega.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const atrasada = diasRestantes !== null && diasRestantes < 0 && os.status !== "entregue";
  const pecasReprovadas = os.pecas.filter((p) => p.status_cq === "reprovado").length;

  async function doChangeStatus(newStatus: string, extraFields: Record<string, string>) {
    setLoading(true);
    try {
      await changeOSStatus({
        osId: os.id, osCodigo: os.codigo, fromStatus: os.status, toStatus: newStatus,
        userName: profile?.nome || "Sistema", extraFields,
      });
      toast({ title: `${os.codigo}: ${TRANSITION_LABELS[newStatus]}` });
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao mudar status", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(newStatus: string) {
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
      setPendingStatusAfterRomaneio(newStatus);
      setRomaneioOpen(true);
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

  async function handleConfirm(extraFields: Record<string, string>) {
    await doChangeStatus(pendingStatus, extraFields);
    setDialogOpen(false);
  }

  async function handleTerceiroConfirm(terceiroNome: string) {
    await doChangeStatus(pendingStatus, { terceiro: terceiroNome });
    try {
      await supabase.from("ordens_servico").update({ terceiro_nome: terceiroNome } as any).eq("id", os.id);
    } catch {}
    setTerceiroOpen(false);
  }

  async function handleCqReprovaConfirm(motivo: string, pecaIds: string[]) {
    if (pecaIds.length === 0) return;
    setLoading(true);
    try {
      const { error: osErr } = await supabase
        .from("ordens_servico")
        .update({ status: "acabamento", localizacao: "Base 2", updated_at: new Date().toISOString() } as any)
        .eq("id", os.id);
      if (osErr) throw osErr;

      const { error: pecasErr } = await supabase
        .from("pecas")
        .update({
          status_cq: "reprovado", cq_aprovado: false, cq_observacao: motivo,
          status_acabamento: "pendente", updated_at: new Date().toISOString(),
        } as any)
        .in("id", pecaIds);
      if (pecasErr) throw pecasErr;

      await supabase.from("activity_logs").insert({
        action: "cq_reprovado", entity_type: "ordens_servico", entity_id: os.id, entity_description: os.codigo,
        user_name: profile?.nome || "Sistema",
        details: { motivo, pecas_reprovadas: pecaIds.length, peca_ids: pecaIds, from_status: "cq", to_status: "acabamento" },
      });

      toast({ title: `${os.codigo} reprovada no CQ`, description: `${pecaIds.length} peça(s) retornou para Acabamento.` });
      setCqReprovaOpen(false);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao reprovar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Linha principal: identificação + status */}
      <div className="p-5 flex flex-wrap items-start gap-4 justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.badgeClass}`}>
              {tag.label}
            </span>
            <h2 className="font-display text-xl text-foreground tracking-tight">
              {os.codigo}
            </h2>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground">{os.cliente}</span>
            <OSDetalheDetalhes os={os} />
          </div>
          {os.origem !== "os" && os.registro_origem_codigo && (
            <p className="text-xs text-muted-foreground">
              {os.registro_origem_numero_os ? (
                <>Vinculada à OS <span className="font-medium text-foreground">{os.registro_origem_numero_os}</span> · </>
              ) : null}
              <Link
                to="/registros"
                className="inline-flex items-center gap-0.5 underline decoration-muted-foreground/30 hover:decoration-foreground"
              >
                Registro {os.registro_origem_codigo}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </p>
          )}
        </div>

        {/* Status badge grande */}
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${osBadgeClass(os.status)}`}>
            {STATUS_LABELS[os.status] || os.status}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{os.localizacao || "—"}</span>
        </div>
      </div>

      {/* Linha de alertas — só renderiza se houver algum */}
      {(ocorrenciasPendentes > 0 || romaneioEmTransito || atrasada || pecasReprovadas > 0 || os.registro_origem_aguarda_projetos) && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {pecasReprovadas > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-nue-vermelho text-white">
              <AlertCircle className="h-3 w-3" /> {pecasReprovadas} peça(s) reprovada(s) — retrabalho
            </span>
          )}
          {ocorrenciasPendentes > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-red-100 text-red-700">
              <AlertCircle className="h-3 w-3" /> {ocorrenciasPendentes} ocorrência(s) pendente(s)
            </span>
          )}
          {romaneioEmTransito && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">
              <Truck className="h-3 w-3" /> {romaneioEmTransito.codigo} em trânsito
            </span>
          )}
          {atrasada && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-orange-100 text-orange-700">
              <Clock className="h-3 w-3" /> {Math.abs(diasRestantes!)}d em atraso
            </span>
          )}
          {os.registro_origem_aguarda_projetos && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-purple-100 text-purple-700">
              <Palette className="h-3 w-3" /> Aguardando Projetos
            </span>
          )}
        </div>
      )}

      {/* Linha de ação primária + dropdown de secundárias */}
      {nextStatuses.length === 0 ? (
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          Nenhuma ação disponível para este status.
        </div>
      ) : (
        <div className="border-t px-5 py-3 flex flex-wrap items-center gap-2">
          {primaryBtn && primaryStatus && (
            (() => {
              const buttonNode = (
                <Button
                  size="lg"
                  disabled={loading || primaryBtn.disabled}
                  onClick={() => handleSelect(primaryStatus)}
                  className="flex-1 sm:flex-none sm:min-w-[240px] justify-between"
                >
                  <span className="flex items-center">
                    {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    {primaryBtn.label}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              );
              if (primaryBtn.tooltip) {
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><span className="flex-1 sm:flex-none">{buttonNode}</span></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{primaryBtn.tooltip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              return buttonNode;
            })()
          )}
          {secondaryStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  Mais ações <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[260px]">
                {secondaryStatuses.map((ns, idx) => {
                  const regressive = isRegressive(os.status, ns);
                  const btn = regressive
                    ? { label: `Reprovar → ${TRANSITION_LABELS[ns]}`, disabled: false, tooltip: undefined as string | undefined }
                    : getBotaoProximoStatus(os, ns);
                  return (
                    <div key={ns}>
                      {idx > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        disabled={btn.disabled || loading}
                        onClick={() => handleSelect(ns)}
                        className={regressive ? "text-destructive focus:text-destructive" : ""}
                      >
                        <span className="flex flex-col">
                          <span className="text-sm">{btn.label}</span>
                          {btn.tooltip && <span className="text-[10px] text-muted-foreground mt-0.5">{btn.tooltip}</span>}
                        </span>
                      </DropdownMenuItem>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <StatusChangeDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        osCodigo={os.codigo} fromStatus={os.status} toStatus={pendingStatus}
        loading={loading} onConfirm={handleConfirm}
      />
      <BlockedTransitionDialog
        open={blockedDialog.open}
        onOpenChange={(o) => setBlockedDialog((s) => ({ ...s, open: o }))}
        title={blockedDialog.title} reason={blockedDialog.reason} details={blockedDialog.details}
      />
      <TerceiroSelectDialog
        open={terceiroOpen} onOpenChange={setTerceiroOpen}
        loading={loading} onConfirm={handleTerceiroConfirm}
      />
      <CqReprovaDialog
        open={cqReprovaOpen} onOpenChange={setCqReprovaOpen}
        pecas={os.pecas} loading={loading} onConfirm={handleCqReprovaConfirm}
      />
      <NovoRomaneioDialog
        open={romaneioOpen}
        onOpenChange={(o) => {
          setRomaneioOpen(o);
          if (!o) {
            setRomaneioPreset(null);
            if (!romaneioSuccessRef.current) {
              setPendingStatusAfterRomaneio(null);
            }
            romaneioSuccessRef.current = false;
          }
        }}
        presetTipoRota={romaneioPreset?.tipoRota}
        presetOsId={romaneioPreset?.osId}
        onSuccess={async () => {
          romaneioSuccessRef.current = true;
          if (pendingStatusAfterRomaneio) {
            const next = pendingStatusAfterRomaneio;
            setPendingStatusAfterRomaneio(null);
            await doChangeStatus(next, {});
          }
          onStatusChanged?.();
        }}
      />
    </div>
  );
}
