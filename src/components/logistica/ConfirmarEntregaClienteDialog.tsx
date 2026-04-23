import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, X, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ConfirmarEntregaClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  romaneioId: string;
  romaneioCodigo: string;
  /** OS IDs that should be marked as "entregue" once the client confirms receipt */
  osIds: string[];
  onConfirmed?: () => void;
}

const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

export function ConfirmarEntregaClienteDialog({
  open,
  onOpenChange,
  romaneioId,
  romaneioCodigo,
  osIds,
  onConfirmed,
}: ConfirmarEntregaClienteDialogProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === "admin";
  const [foto, setFoto] = useState<File | null>(null);
  const [bypass, setBypass] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [recebidoPor, setRecebidoPor] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFoto(null);
    setBypass(false);
    setJustificativa("");
    setRecebidoPor("");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_IMG.includes(f.type)) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG ou WEBP", variant: "destructive" });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    setFoto(f);
  }

  async function handleConfirm() {
    if (!recebidoPor.trim()) {
      toast({ title: "Informe quem recebeu", variant: "destructive" });
      return;
    }
    if (!bypass && !foto) {
      toast({ title: "Foto do romaneio assinado é obrigatória", variant: "destructive" });
      return;
    }
    if (bypass && !justificativa.trim()) {
      toast({ title: "Justifique por que está pulando a foto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        const ext = foto.name.split(".").pop();
        const path = `${romaneioId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("entregas").upload(path, foto);
        if (upErr) throw upErr;
        fotoUrl = supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
      }

      const now = new Date().toISOString();

      // Update romaneio
      const { error: romErr } = await supabase
        .from("romaneios")
        .update({
          status: "entregue",
          data_recebimento: now,
          recebido_por: recebidoPor.trim(),
          foto_romaneio_assinado_url: fotoUrl,
        } as any)
        .eq("id", romaneioId);
      if (romErr) throw romErr;

      // Update each OS as entregue
      if (osIds.length > 0) {
        const update: Record<string, unknown> = {
          status: "entregue",
          localizacao: "Cliente",
          entregue_confirmado_por: recebidoPor.trim(),
          entregue_confirmado_em: now,
          foto_entrega_url: fotoUrl,
          updated_at: now,
        };
        if (bypass) {
          update.entregue_sem_foto_justificativa = justificativa.trim();
          update.entregue_bypass_por = profile?.nome || "Admin";
        }
        const { error: osErr } = await supabase
          .from("ordens_servico")
          .update(update as any)
          .in("id", osIds);
        if (osErr) throw osErr;

        // Resolve linked registros (registros where os_id is in osIds OR os_gerada_id in osIds)
        await supabase
          .from("registros")
          .update({ status: "resolvido" } as any)
          .in("os_id", osIds);
        await supabase
          .from("registros")
          .update({ status: "resolvido" } as any)
          .in("os_gerada_id", osIds);
      }

      await supabase.from("activity_logs").insert({
        action: "confirmacao_entrega_cliente",
        entity_type: "romaneios",
        entity_id: romaneioId,
        entity_description: romaneioCodigo,
        user_name: profile?.nome || "Sistema",
        details: { recebido_por: recebidoPor, bypass, justificativa: bypass ? justificativa : null, os_count: osIds.length },
      });

      toast({ title: "Entrega confirmada", description: bypass ? "Registrada sem foto (bypass admin)" : `${osIds.length} OS marcada(s) como entregue` });
      reset();
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Confirmar entrega ao cliente</DialogTitle>
          <DialogDescription>
            {romaneioCodigo} — anexe a foto do romaneio assinado pelo cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Recebido por *</Label>
            <input
              type="text"
              value={recebidoPor}
              onChange={(e) => setRecebidoPor(e.target.value)}
              placeholder="Nome de quem recebeu no cliente"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Foto do romaneio assinado {!bypass && "*"}</Label>
            {foto ? (
              <div className="relative inline-block">
                <img src={URL.createObjectURL(foto)} alt="" className="h-32 w-32 rounded-md border object-cover" />
                <button
                  type="button"
                  onClick={() => setFoto(null)}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border hover:bg-muted/30 transition"
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tirar foto / anexar imagem</span>
              </button>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} className="hidden" />
          </div>

          {isAdmin && (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input type="checkbox" checked={bypass} onChange={(e) => setBypass(e.target.checked)} />
                <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                Confirmar sem foto (bypass admin)
              </label>
              {bypass && (
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Justifique por que está confirmando sem a foto..."
                  rows={2}
                  className="text-xs"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
