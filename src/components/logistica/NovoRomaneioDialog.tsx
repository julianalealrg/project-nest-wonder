import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ROTA_LABELS } from "@/hooks/useRomaneios";
import { gerarCodigoRomaneio } from "@/lib/gerarCodigoRomaneio";

interface OSOption {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_endereco: string | null;
  status: string;
  pecas: { id: string; item: string; descricao: string }[];
}

/**
 * Mapeia tipo de rota → status de OS compatíveis para criar romaneio.
 * Bloqueia o "porta lateral" de criar romaneio fora do fluxo da OS.
 */
const STATUS_COMPATIVEIS_POR_ROTA: Record<string, string[]> = {
  base1_base2: ["cortando"],
  base2_cliente: ["expedicao"],
  base1_cliente: ["terceiros"],
  base2_base1: ["acabamento", "cq"],
  recolha: ["entregue"],
};

const STATUS_LABEL_PT: Record<string, string> = {
  aguardando_material: "Ag. Material",
  fila_corte: "Fila Corte",
  cortando: "Cortando",
  enviado_base2: "Enviado B2",
  acabamento: "Acabamento",
  cq: "CQ",
  expedicao: "Expedição",
  entregue: "Entregue",
  terceiros: "Terceiros",
};

interface NovoRomaneioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  presetTipoRota?: string;
  presetOsId?: string;
  /** Restringe as opções de rota disponíveis no dropdown. Se omitido, mostra todas. */
  allowedRotas?: string[];
}

export function NovoRomaneioDialog({ open, onOpenChange, onSuccess, presetTipoRota, presetOsId, allowedRotas }: NovoRomaneioDialogProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tipoRota, setTipoRota] = useState("");
  const [motorista, setMotorista] = useState("");
  const [ajudante, setAjudante] = useState("");
  const [enderecoDestino, setEnderecoDestino] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [osList, setOsList] = useState<OSOption[]>([]);
  const [selectedOsIds, setSelectedOsIds] = useState<string[]>([]);
  const [selectedPecaIds, setSelectedPecaIds] = useState<Set<string>>(new Set());
  const [loadingOs, setLoadingOs] = useState(false);

  // Load OS list
  useEffect(() => {
    if (!open) return;
    async function load() {
      setLoadingOs(true);
      const { data } = await supabase
        .from("ordens_servico")
        .select("id, codigo, status, clientes(nome, endereco)")
        .order("codigo");
      if (data) {
        const osIds = data.map((d) => d.id);
        const { data: pecasData } = await supabase
          .from("pecas")
          .select("id, item, descricao, os_id")
          .in("os_id", osIds);

        const pecasMap = new Map<string, { id: string; item: string; descricao: string }[]>();
        (pecasData || []).forEach((p) => {
          const list = pecasMap.get(p.os_id) || [];
          list.push({ id: p.id, item: p.item || "", descricao: p.descricao || "" });
          pecasMap.set(p.os_id, list);
        });

        const list = data.map((d) => {
          const cli = d.clientes as any;
          return {
            id: d.id,
            codigo: d.codigo,
            cliente_nome: cli?.nome || "—",
            cliente_endereco: cli?.endereco || null,
            status: d.status,
            pecas: pecasMap.get(d.id) || [],
          };
        });
        setOsList(list);

        // Aplicar preset (OS pré-selecionada vinda da Produção)
        if (presetOsId) {
          const presetOs = list.find((o) => o.id === presetOsId);
          if (presetOs) {
            setSelectedOsIds([presetOsId]);
            setSelectedPecaIds(new Set(presetOs.pecas.map((p) => p.id)));
          }
        }
      }
      setLoadingOs(false);
    }
    load();
  }, [open, presetOsId]);

  // Aplicar tipo de rota preset
  useEffect(() => {
    if (open && presetTipoRota) setTipoRota(presetTipoRota);
  }, [open, presetTipoRota]);

  function reset() {
    setTipoRota("");
    setMotorista("");
    setAjudante("");
    setEnderecoDestino("");
    setObservacoes("");
    setSelectedOsIds([]);
    setSelectedPecaIds(new Set());
  }

  function toggleOs(osId: string) {
    setSelectedOsIds((prev) => {
      if (prev.includes(osId)) {
        // Remove OS and its pecas
        const os = osList.find((o) => o.id === osId);
        if (os) {
          setSelectedPecaIds((sp) => {
            const next = new Set(sp);
            os.pecas.forEach((p) => next.delete(p.id));
            return next;
          });
        }
        return prev.filter((id) => id !== osId);
      } else {
        // Add OS and select all its pecas
        const os = osList.find((o) => o.id === osId);
        if (os) {
          setSelectedPecaIds((sp) => {
            const next = new Set(sp);
            os.pecas.forEach((p) => next.add(p.id));
            return next;
          });
          // Auto-fill endereço for B2→Cliente
          if (tipoRota === "base2_cliente" && os.cliente_endereco && !enderecoDestino) {
            setEnderecoDestino(os.cliente_endereco);
          }
        }
        return [...prev, osId];
      }
    });
  }

  function togglePeca(pecaId: string) {
    setSelectedPecaIds((prev) => {
      const next = new Set(prev);
      if (next.has(pecaId)) next.delete(pecaId);
      else next.add(pecaId);
      return next;
    });
  }

  const selectedOSes = osList.filter((o) => selectedOsIds.includes(o.id));

  // Filtra OS exibidas pela compatibilidade com o tipo de rota selecionado
  const statusCompativeis = tipoRota ? STATUS_COMPATIVEIS_POR_ROTA[tipoRota] || [] : [];
  const osListFiltrada = tipoRota
    ? osList.filter((o) => statusCompativeis.includes(o.status))
    : [];

  // Lista de status compatíveis em PT pra mostrar no empty state
  const statusCompativeisLabel = statusCompativeis.map((s) => STATUS_LABEL_PT[s] || s).join(", ");

  /**
   * Verifica se já existe romaneio pendente/em_transito da mesma OS+rota.
   * Retorna o array de romaneios conflitantes (pode estar vazio).
   */
  async function buscarRomaneiosConflitantes(osIds: string[], rota: string) {
    const { data } = await supabase
      .from("romaneio_pecas")
      .select("romaneio_id, os_id, romaneios(id, codigo, tipo_rota, status)")
      .in("os_id", osIds);

    const conflitos = new Map<string, { id: string; codigo: string; os_ids: Set<string> }>();
    for (const rp of data || []) {
      const rom = (rp as any).romaneios;
      if (!rom) continue;
      if (rom.tipo_rota !== rota) continue;
      if (rom.status !== "pendente" && rom.status !== "em_transito") continue;
      const existing = conflitos.get(rom.id) || { id: rom.id, codigo: rom.codigo, os_ids: new Set() };
      existing.os_ids.add(rp.os_id as string);
      conflitos.set(rom.id, existing);
    }
    return Array.from(conflitos.values());
  }

  async function handleSave() {
    if (!tipoRota) { toast({ title: "Selecione a rota", variant: "destructive" }); return; }
    if (selectedOsIds.length === 0) { toast({ title: "Selecione ao menos uma OS", variant: "destructive" }); return; }
    if (selectedPecaIds.size === 0 && tipoRota !== "base2_cliente") { toast({ title: "Selecione ao menos uma peça", variant: "destructive" }); return; }

    // Verifica conflito com romaneios já abertos da mesma OS+rota
    const conflitos = await buscarRomaneiosConflitantes(selectedOsIds, tipoRota);
    if (conflitos.length > 0) {
      const lista = conflitos.map((c) => c.codigo).join(", ");
      const escolha = window.confirm(
        `Já existe romaneio aberto pra alguma OS selecionada nesta rota: ${lista}\n\n` +
        `Cancelar o(s) anterior(es) e criar um novo?\n\n` +
        `OK = cancela anteriores e cria novo\n` +
        `Cancelar = mantém todos (criar romaneio adicional)`
      );
      if (escolha) {
        // Cancelar romaneios anteriores
        const ids = conflitos.map((c) => c.id);
        await supabase
          .from("romaneios")
          .update({ status: "cancelado" } as any)
          .in("id", ids);
        for (const c of conflitos) {
          await supabase.from("activity_logs").insert({
            action: "romaneio_cancelado",
            entity_type: "romaneios",
            entity_id: c.id,
            entity_description: c.codigo,
            user_name: profile?.nome || "Sistema",
            details: { motivo: "Substituído por romaneio novo da mesma OS+rota" },
          });
        }
      }
    }

    setSaving(true);
    try {
      // Generate code (novo padrão: ROM-{B1B2|B2C|...}-{YY}-{NNN})
      const codigo = await gerarCodigoRomaneio(tipoRota);

      const { data: newRom, error: romError } = await supabase
        .from("romaneios")
        .insert({
          codigo,
          tipo_rota: tipoRota,
          motorista: motorista || null,
          ajudante: ajudante || null,
          endereco_destino: enderecoDestino || null,
          observacoes: observacoes || null,
          status: "pendente",
        })
        .select("id")
        .single();

      if (romError) throw romError;

      // Insert romaneio_pecas
      if (tipoRota === "base2_cliente" && selectedPecaIds.size === 0) {
        // For B2→Cliente with free description, insert one entry per OS without specific peça
        // We'll still link OS via a dummy entry
        for (const osId of selectedOsIds) {
          const os = osList.find((o) => o.id === osId);
          if (os && os.pecas.length > 0) {
            // Select all pecas for this OS
            for (const p of os.pecas) {
              await supabase.from("romaneio_pecas").insert({
                romaneio_id: newRom.id,
                peca_id: p.id,
                os_id: osId,
              });
            }
          }
        }
      } else {
        const inserts = [];
        for (const pecaId of selectedPecaIds) {
          // Find which OS this peca belongs to
          let osId: string | null = null;
          for (const os of selectedOSes) {
            if (os.pecas.some((p) => p.id === pecaId)) {
              osId = os.id;
              break;
            }
          }
          inserts.push({
            romaneio_id: newRom.id,
            peca_id: pecaId,
            os_id: osId,
          });
        }
        if (inserts.length > 0) {
          const { error: rpError } = await supabase.from("romaneio_pecas").insert(inserts);
          if (rpError) throw rpError;
        }
      }

      await supabase.from("activity_logs").insert({
        action: "criacao_romaneio",
        entity_type: "romaneios",
        entity_id: newRom.id,
        entity_description: codigo,
        user_name: profile?.nome || "Sistema",
        details: { tipo_rota: tipoRota, os_count: selectedOsIds.length, pecas_count: selectedPecaIds.size },
      });

      toast({ title: `Romaneio ${codigo} criado!` });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Novo Romaneio</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Rota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rota *</Label>
                <Select value={tipoRota} onValueChange={setTipoRota}>
                  <SelectTrigger><SelectValue placeholder="Selecione a rota" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROTA_LABELS)
                      .filter(([k]) => !allowedRotas || allowedRotas.includes(k))
                      .map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motorista</Label>
                <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome do motorista" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ajudante</Label>
                <Input value={ajudante} onChange={(e) => setAjudante(e.target.value)} placeholder="Nome do ajudante" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço destino</Label>
                <Input value={enderecoDestino} onChange={(e) => setEnderecoDestino(e.target.value)} placeholder="Endereço de entrega" />
              </div>
            </div>

            {/* OS selection — só aparece após escolher a rota */}
            {tipoRota && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Selecionar OS * <span className="font-normal text-muted-foreground">(status compatível: {statusCompativeisLabel})</span>
                </Label>
                {loadingOs ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : osListFiltrada.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                    Nenhuma OS no status <span className="font-medium">{statusCompativeisLabel}</span> agora. Avance a OS no painel de Produção pra que ela apareça aqui.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
                    {osListFiltrada.map((os) => (
                      <label key={os.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedOsIds.includes(os.id)}
                          onCheckedChange={() => toggleOs(os.id)}
                        />
                        <span className="font-medium">{os.codigo}</span>
                        <span className="text-muted-foreground text-xs">— {os.cliente_nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!tipoRota && (
              <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                Selecione a rota acima pra ver as OS disponíveis.
              </div>
            )}

            {/* Peças checklist */}
            {selectedOSes.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Peças</Label>
                {selectedOSes.map((os) => (
                  <div key={os.id} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{os.codigo}</p>
                    <div className="space-y-0.5 pl-2">
                      {os.pecas.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                          <Checkbox
                            checked={selectedPecaIds.has(p.id)}
                            onCheckedChange={() => togglePeca(p.id)}
                          />
                          <span className="text-foreground">{p.item} — {p.descricao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* B2→Cliente: descrição livre */}
            {tipoRota === "base2_cliente" && (
              <div className="space-y-1">
                <Label className="text-xs">Descrição do que está saindo</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Descreva as peças/volumes sendo enviados..."
                  rows={3}
                />
              </div>
            )}

            {tipoRota !== "base2_cliente" && (
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !tipoRota}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Criar Romaneio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
