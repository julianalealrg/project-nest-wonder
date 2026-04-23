import { useState } from "react";
import { X, FileText, CheckCircle, Loader2, Truck } from "lucide-react";
import { gerarPDFRomaneio } from "@/lib/pdfRomaneio";
import { Romaneio, ROTA_LABELS, ROMANEIO_STATUS_LABELS } from "@/hooks/useRomaneios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface RomaneioPanelProps {
  romaneio: Romaneio | null;
  onClose: () => void;
  onChanged?: () => void;
  /** Quando true, renderiza dentro de um Dialog centralizado em vez de side-panel. */
  asDialog?: boolean;
}

export function RomaneioPanel({ romaneio, onClose, onChanged, asDialog = false }: RomaneioPanelProps) {
  const [loading, setLoading] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [conferencias, setConferencias] = useState<Record<string, string>>({});
  const { profile } = useAuth();

  if (!romaneio) return null;

  const canDepart = romaneio.status === "pendente";
  const canReceive = romaneio.status === "em_transito";

  async function handleDespachar() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("romaneios")
        .update({ status: "em_transito", data_saida: new Date().toISOString() })
        .eq("id", romaneio!.id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "despacho_romaneio",
        entity_type: "romaneios",
        entity_id: romaneio!.id,
        entity_description: romaneio!.codigo,
        user_name: profile?.nome || "Sistema",
        details: { status: "em_transito" },
      });

      toast({ title: `${romaneio!.codigo} despachado` });
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function startConferencia() {
    const initial: Record<string, string> = {};
    romaneio!.pecas.forEach((p) => {
      initial[p.id] = p.conferencia || "ok";
    });
    setConferencias(initial);
    setConferindo(true);
  }

  async function handleConfirmarRecebimento() {
    setLoading(true);
    try {
      // Update each romaneio_peca conferencia
      for (const [pecaId, status] of Object.entries(conferencias)) {
        await supabase
          .from("romaneio_pecas")
          .update({ conferencia: status })
          .eq("id", pecaId);
      }

      // Update romaneio
      const { error } = await supabase
        .from("romaneios")
        .update({
          status: "entregue",
          data_recebimento: new Date().toISOString(),
          recebido_por: profile?.nome || "Sistema",
        })
        .eq("id", romaneio!.id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "recebimento_romaneio",
        entity_type: "romaneios",
        entity_id: romaneio!.id,
        entity_description: romaneio!.codigo,
        user_name: profile?.nome || "Sistema",
        details: { conferencias },
      });

      // Sincronizar OS vinculadas: se for romaneio B1->B2, avançar OS de "enviado_base2" para "acabamento"
      if (romaneio!.tipo_rota === "base1_base2") {
        const osIds = Array.from(
          new Set(romaneio!.pecas.map((p: any) => p.os_id).filter(Boolean)),
        ) as string[];
        if (osIds.length > 0) {
          // Buscar OS que estão em enviado_base2 para logar apenas as efetivamente atualizadas
          const { data: osParaAtualizar } = await supabase
            .from("ordens_servico")
            .select("id, codigo")
            .in("id", osIds)
            .eq("status", "enviado_base2");

          if (osParaAtualizar && osParaAtualizar.length > 0) {
            const idsParaAtualizar = osParaAtualizar.map((o) => o.id);
            await supabase
              .from("ordens_servico")
              .update({
                status: "acabamento",
                localizacao: "Base 2",
                updated_at: new Date().toISOString(),
              })
              .in("id", idsParaAtualizar);

            // Log por OS
            const logs = osParaAtualizar.map((o) => ({
              action: "avanco_automatico_pos_recebimento",
              entity_type: "ordens_servico",
              entity_id: o.id,
              entity_description: o.codigo,
              user_name: profile?.nome || "Sistema",
              details: {
                from_status: "enviado_base2",
                to_status: "acabamento",
                romaneio_id: romaneio!.id,
                romaneio_codigo: romaneio!.codigo,
              },
            }));
            await supabase.from("activity_logs").insert(logs);
          }
        }
      }

      toast({ title: `${romaneio!.codigo} recebido com sucesso` });
      setConferindo(false);
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    pendente: "bg-muted text-muted-foreground",
    em_transito: "bg-blue-100 text-blue-700",
    entregue: "bg-green-100 text-green-700",
  };

  const headerNode = (
    <div className="flex items-center justify-between px-5 py-4 border-b">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{romaneio.codigo}</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[romaneio.status] || ""}`}>
            {ROMANEIO_STATUS_LABELS[romaneio.status] || romaneio.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{ROTA_LABELS[romaneio.tipo_rota] || romaneio.tipo_rota}</p>
      </div>
      {!asDialog && (
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  const bodyNode = (
    <div className="p-5 space-y-6">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">OS</span>
          <p className="text-foreground font-medium">{romaneio.os_codigos.join(", ") || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Cliente</span>
          <p className="text-foreground font-medium">{romaneio.cliente_nome}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Motorista</span>
          <p className="text-foreground">{romaneio.motorista || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Ajudante</span>
          <p className="text-foreground">{romaneio.ajudante || "—"}</p>
        </div>
        {romaneio.endereco_destino && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs">Endereço destino</span>
            <p className="text-foreground">{romaneio.endereco_destino}</p>
          </div>
        )}
        {romaneio.data_saida && (
          <div>
            <span className="text-muted-foreground text-xs">Saída</span>
            <p className="text-foreground">{new Date(romaneio.data_saida).toLocaleDateString("pt-BR")}</p>
          </div>
        )}
        {romaneio.data_recebimento && (
          <div>
            <span className="text-muted-foreground text-xs">Recebimento</span>
            <p className="text-foreground">{new Date(romaneio.data_recebimento).toLocaleDateString("pt-BR")}</p>
          </div>
        )}
        {romaneio.recebido_por && (
          <div>
            <span className="text-muted-foreground text-xs">Recebido por</span>
            <p className="text-foreground">{romaneio.recebido_por}</p>
          </div>
        )}
      </div>

      {romaneio.observacoes && (
        <>
          <Separator />
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Observações</h3>
            <p className="text-sm text-foreground">{romaneio.observacoes}</p>
          </div>
        </>
      )}

      <Separator />

      {/* Peças */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Peças ({romaneio.pecas.length})
        </h3>
        <div className="space-y-2">
          {romaneio.pecas.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30 text-sm">
              <span className="font-medium text-foreground w-6 text-center">{p.peca_item}</span>
              <div className="flex-1">
                <span className="text-foreground">{p.peca_descricao}</span>
                <span className="text-muted-foreground text-xs ml-2">{p.os_codigo}</span>
              </div>
              {conferindo ? (
                <Select
                  value={conferencias[p.id] || "ok"}
                  onValueChange={(v) => setConferencias((prev) => ({ ...prev, [p.id]: v }))}
                >
                  <SelectTrigger className="w-[110px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">✓ OK</SelectItem>
                    <SelectItem value="faltou">✗ Faltou</SelectItem>
                    <SelectItem value="avariada">⚠ Avariada</SelectItem>
                  </SelectContent>
                </Select>
              ) : (() => {
                // Só mostra badge de conferência quando o romaneio já chegou ao destino.
                const showConferencia =
                  romaneio.status === "entregue" || romaneio.status === "recebido";
                const conf = p.conferencia;
                if (!showConferencia || !conf || conf === "pendente") {
                  return <span className="text-[10px] text-muted-foreground">—</span>;
                }
                if (conf === "ok") {
                  return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 uppercase">
                      OK
                    </span>
                  );
                }
                if (conf === "faltou" || conf === "faltante") {
                  return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 uppercase">
                      Faltante
                    </span>
                  );
                }
                if (conf === "avariada") {
                  return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 uppercase">
                      Avariada
                    </span>
                  );
                }
                return <span className="text-[10px] text-muted-foreground">—</span>;
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const footerNode = (
    <div className="border-t px-5 py-3 flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={() => gerarPDFRomaneio(romaneio)}>
        <FileText className="h-4 w-4 mr-1" /> Gerar PDF
      </Button>
      {canDepart && (
        <Button size="sm" className="flex-1" disabled={loading} onClick={handleDespachar}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
          Despachar
        </Button>
      )}
      {canReceive && !conferindo && (
        <Button size="sm" className="flex-1" onClick={startConferencia}>
          <CheckCircle className="h-4 w-4 mr-1" /> Confirmar Recebimento
        </Button>
      )}
      {conferindo && (
        <Button size="sm" className="flex-1" disabled={loading} onClick={handleConfirmarRecebimento}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          Confirmar
        </Button>
      )}
    </div>
  );

  if (asDialog) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
          {headerNode}
          {bodyNode}
          {footerNode}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[460px] bg-card border-l z-50 flex flex-col animate-slide-in-right">
        {headerNode}
        <ScrollArea className="flex-1">{bodyNode}</ScrollArea>
        {footerNode}
      </div>
    </>
  );
}
