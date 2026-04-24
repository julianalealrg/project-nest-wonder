import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, Palette, ArrowUpRight } from "lucide-react";
import { MockOS, STATUS_STEPS, STATUS_MAP, STATUS_LABELS } from "@/data/mockProducao";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step}
            className={`text-center text-[10px] leading-tight ${i <= (idx ?? -1) ? "font-medium text-foreground" : "text-muted-foreground"}`}
            style={{ width: `${100 / total}%` }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  os: MockOS;
  onStatusChanged?: () => void;
}

export function OSDetalheGeral({ os, onStatusChanged }: Props) {
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

  const nextStatuses = getNextStatuses(os.status);

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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Coluna esquerda: Informações */}
      <div className="space-y-5 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Material", value: os.material },
            { label: "Ambiente", value: os.ambiente },
            { label: "Supervisor", value: os.supervisor },
            { label: "Projetista", value: os.projetista },
            { label: "Área", value: `${os.area_m2} m²` },
            { label: "Localização", value: os.localizacao },
            { label: "Data Emissão", value: os.data_emissao ? new Date(os.data_emissao).toLocaleDateString("pt-BR") : "—" },
            { label: "Data Entrega", value: os.data_entrega ? new Date(os.data_entrega).toLocaleDateString("pt-BR") : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <p className="text-[14px] font-medium text-foreground">{value || "—"}</p>
            </div>
          ))}
          {os.terceiro && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[11px] text-muted-foreground">Terceiro</span>
              <p className="text-[14px] text-foreground">{os.terceiro}</p>
            </div>
          )}
        </div>

        {os.registro_origem_id && os.registro_origem_codigo && (
          <>
            <Separator />
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Origem</span>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-foreground">Gerada a partir do registro</span>
                <Link
                  to="/registros"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-nue-azul/15 text-nue-azul transition-opacity hover:opacity-80"
                >
                  {os.registro_origem_codigo}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
                {os.registro_origem_aguarda_projetos && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-100 text-purple-700">
                    <Palette className="h-2.5 w-2.5" /> Aguardando Projetos
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${osBadgeClass(os.status)}`}>
              {STATUS_LABELS[os.status] || os.status}
            </span>
          </div>
          <ProgressBar status={os.status} />
        </div>
      </div>

      {/* Coluna direita: Ações de transição */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Próximas ações</h3>
        {nextStatuses.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Nenhuma ação disponível para este status.</p>
        ) : (
          <div className="flex flex-col gap-2">
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
                      ? "w-full justify-between border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                      : "w-full justify-between"
                  }
                  disabled={loading || btn.disabled}
                  onClick={() => handleSelect(ns)}
                >
                  <span className="flex items-center">
                    {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    {btn.label}
                  </span>
                  {!regressive && <ChevronRight className="h-4 w-4" />}
                </Button>
              );

              if (btn.tooltip) {
                return (
                  <TooltipProvider key={ns}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block">{buttonNode}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{btn.tooltip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              return buttonNode;
            })}
          </div>
        )}
      </div>

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
        onOpenChange={(o) => { setRomaneioOpen(o); if (!o) setRomaneioPreset(null); }}
        presetTipoRota={romaneioPreset?.tipoRota}
        presetOsId={romaneioPreset?.osId}
        onSuccess={() => onStatusChanged?.()}
      />
    </div>
  );
}
