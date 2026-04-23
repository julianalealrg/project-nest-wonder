import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MockPeca } from "@/data/mockProducao";

interface CqReprovaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pecas: MockPeca[];
  loading: boolean;
  onConfirm: (motivo: string, pecaIds: string[]) => void;
}

export function CqReprovaDialog({ open, onOpenChange, pecas, loading, onConfirm }: CqReprovaDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setMotivo("");
      setSelected(new Set(pecas.map((p) => p.id)));
    }
  }, [open, pecas]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === pecas.length) setSelected(new Set());
    else setSelected(new Set(pecas.map((p) => p.id)));
  }

  const isValid = motivo.trim().length > 0 && selected.size > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Reprovar no CQ — voltar para Acabamento</DialogTitle>
          <DialogDescription className="text-xs">
            Esta ação devolve a OS para Acabamento (Base 2). Marque as peças reprovadas e descreva o motivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo da reprovação *</Label>
            <Textarea
              placeholder="Descreva o que precisa ser refeito"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Peças afetadas *</Label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {selected.size === pecas.length ? "Desmarcar todas" : "Marcar todas"}
              </button>
            </div>
            <ScrollArea className="max-h-48 rounded-md border border-border">
              <div className="p-2 space-y-1">
                {pecas.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                    />
                    <span className="w-6 text-center font-medium">{p.item}</span>
                    <span className="flex-1 truncate text-foreground">{p.descricao}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-[10.5px] text-muted-foreground">
              {selected.size} de {pecas.length} peça{pecas.length > 1 ? "s" : ""} marcada{selected.size === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onConfirm(motivo.trim(), Array.from(selected))}
            disabled={loading || !isValid}
          >
            {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Reprovar e voltar para Acabamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
