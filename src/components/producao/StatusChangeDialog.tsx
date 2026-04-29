import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { STATUS_LABELS } from "@/lib/statusTransitions";

interface TransitionField {
  key: string;
  label: string;
  required: boolean;
}

const TRANSITION_FIELDS: Record<string, TransitionField[]> = {
  "aguardando_material->fila_corte": [],
  "fila_corte->cortando": [],
  "cortando->enviado_base2": [],
  "cortando->terceiros": [{ key: "terceiro", label: "Qual terceiro", required: true }],
  "enviado_base2->acabamento": [
    { key: "acabador", label: "Acabador", required: true },
    { key: "cabine", label: "Cabine", required: true },
  ],
  "acabamento->cq": [],
  "cq->expedicao": [{ key: "aprovado_por", label: "Aprovado por", required: true }],
  "cq->acabamento": [{ key: "motivo_reprovacao", label: "Motivo da reprovação", required: true }],
  "expedicao->entregue": [],
  "terceiros->entregue": [],
  "terceiros->terceiros_recusado": [
    { key: "motivo_recusa", label: "Motivo da recusa do terceiro", required: true },
  ],
  "terceiros_recusado->cortando": [],
  "terceiros_recusado->terceiros": [],
};

export function getTransitionFields(from: string, to: string): TransitionField[] {
  return TRANSITION_FIELDS[`${from}->${to}`] || [];
}

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  osCodigo: string;
  fromStatus: string;
  toStatus: string;
  loading: boolean;
  onConfirm: (extraFields: Record<string, string>) => void;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  osCodigo,
  fromStatus,
  toStatus,
  loading,
  onConfirm,
}: StatusChangeDialogProps) {
  const fields = getTransitionFields(fromStatus, toStatus);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const fromLabel = STATUS_LABELS[fromStatus] || fromStatus;
  const toLabel = STATUS_LABELS[toStatus] || toStatus;

  function handleConfirm() {
    const newErrors: Record<string, boolean> = {};
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        newErrors[f.key] = true;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onConfirm(values);
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setValues({});
      setErrors({});
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Confirmar mudança de status</DialogTitle>
          <DialogDescription>
            {osCodigo}: {fromLabel} → {toLabel}
          </DialogDescription>
        </DialogHeader>

        {fields.length > 0 && (
          <div className="space-y-4 py-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label} {f.required && "*"}</Label>
                <Input
                  id={f.key}
                  value={values[f.key] || ""}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [f.key]: e.target.value }));
                    setErrors((prev) => ({ ...prev, [f.key]: false }));
                  }}
                  className={errors[f.key] ? "border-destructive" : ""}
                  autoFocus={fields.indexOf(f) === 0}
                />
                {errors[f.key] && (
                  <p className="text-xs text-destructive">Campo obrigatório</p>
                )}
              </div>
            ))}
          </div>
        )}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Deseja confirmar a mudança de status?
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
