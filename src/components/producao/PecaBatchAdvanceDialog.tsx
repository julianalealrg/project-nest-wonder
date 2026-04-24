import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

type StationKey = "corte" | "45" | "poliborda" | "usinagem" | "acabamento" | "cq";

const STATION_LABELS: Record<StationKey, string> = {
  corte: "Corte",
  "45": "45°",
  poliborda: "Poliborda",
  usinagem: "Usinagem",
  acabamento: "Acabamento",
  cq: "CQ",
};

import type { PecaIrma } from "./PecaAdvanceDialog";

interface PecaBatchAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationKey | null;
  count: number;
  loading: boolean;
  onConfirm: (fields: Record<string, string>) => void;
  /** Outras peças da mesma OS — usado para pré-preencher operadores. */
  irmas?: PecaIrma[];
}

function pickRecente(irmas: PecaIrma[] | undefined, field: keyof PecaIrma): string {
  if (!irmas || irmas.length === 0) return "";
  const ordered = [...irmas].sort((a, b) => {
    const aT = a.updated_at ? new Date(a.updated_at as any).getTime() : 0;
    const bT = b.updated_at ? new Date(b.updated_at as any).getTime() : 0;
    return bT - aT;
  });
  for (const p of ordered) {
    const v = p[field];
    if (v && String(v).trim()) return String(v);
  }
  return "";
}

export function PecaBatchAdvanceDialog({ open, onOpenChange, station, count, loading, onConfirm, irmas }: PecaBatchAdvanceDialogProps) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [cqResult, setCqResult] = useState<"aprovado" | "reprovado">("aprovado");

  useEffect(() => {
    if (!open || !station) {
      if (open) {
        setFields({});
        setCqResult("aprovado");
      }
      return;
    }
    const initial: Record<string, string> = {};
    switch (station) {
      case "corte":
        initial.cortador = pickRecente(irmas, "cortador");
        break;
      case "45":
        initial.operador = pickRecente(irmas, "operador_45");
        break;
      case "poliborda":
        initial.operador = pickRecente(irmas, "operador_poliborda");
        break;
      case "usinagem":
        initial.operador = pickRecente(irmas, "operador_usinagem");
        break;
      case "acabamento":
        initial.acabador = pickRecente(irmas, "acabador");
        initial.cabine = pickRecente(irmas, "cabine");
        break;
    }
    setFields(initial);
    setCqResult("aprovado");
  }, [open, station, irmas]);

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    if (station === "cq") {
      onConfirm({ ...fields, cq_result: cqResult });
    } else {
      onConfirm(fields);
    }
  }

  if (!station) return null;
  const label = STATION_LABELS[station];

  function isValid(): boolean {
    switch (station) {
      case "corte": return !!fields.cortador?.trim();
      case "45":
      case "poliborda":
      case "usinagem": return !!fields.operador?.trim();
      case "acabamento": return !!fields.acabador?.trim() && !!fields.cabine?.trim();
      case "cq":
        if (!fields.responsavel?.trim()) return false;
        if (cqResult === "reprovado" && !fields.observacao?.trim()) return false;
        return true;
      default: return true;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Avançar em lote — {label}</DialogTitle>
          <DialogDescription className="text-xs">
            Os mesmos dados serão aplicados a {count} peça{count > 1 ? "s" : ""} selecionada{count > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {station === "corte" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Cortador *</Label>
              <Input placeholder="Nome do cortador" value={fields.cortador || ""} onChange={(e) => setField("cortador", e.target.value)} />
            </div>
          )}

          {(station === "45" || station === "poliborda" || station === "usinagem") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Operador *</Label>
              <Input placeholder="Nome do operador" value={fields.operador || ""} onChange={(e) => setField("operador", e.target.value)} />
            </div>
          )}

          {station === "acabamento" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Acabador *</Label>
                <Input placeholder="Nome do acabador" value={fields.acabador || ""} onChange={(e) => setField("acabador", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cabine *</Label>
                <Input placeholder="Cabine" value={fields.cabine || ""} onChange={(e) => setField("cabine", e.target.value)} />
              </div>
            </>
          )}

          {station === "cq" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Resultado</Label>
                <RadioGroup value={cqResult} onValueChange={(v) => setCqResult(v as "aprovado" | "reprovado")} className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="aprovado" id="cq-batch-ok" />
                    <Label htmlFor="cq-batch-ok" className="text-xs">Aprovado</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="reprovado" id="cq-batch-nok" />
                    <Label htmlFor="cq-batch-nok" className="text-xs">Reprovado</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Responsável *</Label>
                <Input placeholder="Nome" value={fields.responsavel || ""} onChange={(e) => setField("responsavel", e.target.value)} />
              </div>
              {cqResult === "reprovado" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Observação *</Label>
                  <Input placeholder="Motivo da reprovação" value={fields.observacao || ""} onChange={(e) => setField("observacao", e.target.value)} />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading || !isValid()}>
            {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Confirmar ({count})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
