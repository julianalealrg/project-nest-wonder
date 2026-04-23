import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TerceiroSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirm: (terceiroNome: string) => void;
}

export function TerceiroSelectDialog({ open, onOpenChange, loading, onConfirm }: TerceiroSelectDialogProps) {
  const [terceiros, setTerceiros] = useState<{ id: string; nome: string }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [novo, setNovo] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("terceiros")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setTerceiros(data || []));
  }, [open]);

  function handleConfirm() {
    const nome = novo.trim() || selected;
    if (!nome) return;
    onConfirm(nome);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Enviar para terceiro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Selecionar terceiro existente</Label>
            <Select value={selected} onValueChange={(v) => { setSelected(v); setNovo(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um terceiro" />
              </SelectTrigger>
              <SelectContent>
                {terceiros.map((t) => (
                  <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ou informe um novo terceiro</Label>
            <Input
              placeholder="Nome do terceiro"
              value={novo}
              onChange={(e) => { setNovo(e.target.value); if (e.target.value) setSelected(""); }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || (!selected && !novo.trim())}>
            {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
