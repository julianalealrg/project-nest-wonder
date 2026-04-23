import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { changeOSStatus } from "@/lib/changeOSStatus";

interface TerceiroSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  osId: string;
  osCodigo: string;
  fromStatus: string;
  onConfirmed?: () => void;
}

export function TerceiroSelectDialog({ open, onOpenChange, osId, osCodigo, fromStatus, onConfirmed }: TerceiroSelectDialogProps) {
  const { profile } = useAuth();
  const [terceiros, setTerceiros] = useState<{ id: string; nome: string }[]>([]);
  const [terceiroId, setTerceiroId] = useState("");
  const [terceiroNovo, setTerceiroNovo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("terceiros").select("id, nome").order("nome").then(({ data }) => {
      setTerceiros(data || []);
    });
  }, [open]);

  async function handleConfirm() {
    const nomeFinal = terceiroId === "novo" ? terceiroNovo.trim() : terceiros.find((t) => t.id === terceiroId)?.nome;
    if (!nomeFinal) {
      toast({ title: "Selecione ou cadastre um terceiro", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let finalId = terceiroId;
      if (terceiroId === "novo") {
        const { data: nt, error } = await supabase
          .from("terceiros")
          .insert({ nome: nomeFinal })
          .select("id")
          .single();
        if (error) throw error;
        finalId = nt.id;
      }

      await supabase
        .from("ordens_servico")
        .update({ terceiro_id: finalId, terceiro_nome: nomeFinal } as any)
        .eq("id", osId);

      await changeOSStatus({
        osId,
        osCodigo,
        fromStatus,
        toStatus: "terceiros",
        userName: profile?.nome || "Sistema",
        extraFields: { terceiro: nomeFinal },
      });

      // Generate B1 → Terceiro romaneio entry (using base1_base2 as transport, observação marcada)
      const year = new Date().getFullYear();
      const { data: lastRom } = await supabase
        .from("romaneios")
        .select("codigo")
        .like("codigo", `ROM-${year}-%`)
        .order("codigo", { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (lastRom && lastRom.length > 0) {
        const n = parseInt(lastRom[0].codigo.replace(`ROM-${year}-`, ""), 10);
        if (!isNaN(n)) nextNum = n + 1;
      }
      const codigo = `ROM-${year}-${String(nextNum).padStart(4, "0")}`;

      const { data: rom, error: romErr } = await supabase
        .from("romaneios")
        .insert({
          codigo,
          tipo_rota: "base1_base2",
          status: "pendente",
          endereco_destino: `Terceiro: ${nomeFinal}`,
          observacoes: `Envio para terceiro ${nomeFinal} — OS ${osCodigo}`,
        })
        .select("id")
        .single();
      if (romErr) throw romErr;

      const { data: pecas } = await supabase.from("pecas").select("id").eq("os_id", osId);
      if (pecas && pecas.length > 0) {
        await supabase.from("romaneio_pecas").insert(
          pecas.map((p) => ({ romaneio_id: rom.id, peca_id: p.id, os_id: osId }))
        );
      }

      toast({ title: `${osCodigo} enviada para ${nomeFinal}`, description: `Romaneio ${codigo} gerado` });
      onOpenChange(false);
      onConfirmed?.();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Enviar para terceiro</DialogTitle>
          <DialogDescription>
            {osCodigo} — selecione o terceiro que receberá esta OS. Um romaneio será gerado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Terceiro *</Label>
            <Select value={terceiroId} onValueChange={setTerceiroId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {terceiros.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                <SelectItem value="novo">+ Cadastrar novo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {terceiroId === "novo" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do novo terceiro *</Label>
              <Input value={terceiroNovo} onChange={(e) => setTerceiroNovo(e.target.value)} placeholder="Ex: Marmoraria Parceira" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar e gerar romaneio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
