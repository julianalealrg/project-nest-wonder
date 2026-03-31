import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "./AutocompleteInput";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PecaForm {
  item: string;
  descricao: string;
  quantidade: number;
  comprimento: number | "";
  largura: number | "";
  precisa_45: boolean;
  precisa_poliborda: boolean;
  precisa_usinagem: boolean;
}

interface OSForm {
  codigo: string;
  ambiente: string;
  material: string;
  projetista: string;
  projetista_outro: string;
  data_entrega: string;
  area_m2: number | "";
  pecas: PecaForm[];
}

interface ClienteForm {
  nome: string;
  endereco: string;
  supervisor: string;
  supervisor_outro: string;
  contato: string;
}

const PROJETISTAS = ["Letícia", "Lucas", "Rebeca", "Izabeli"];
const SUPERVISORES = ["Gino", "Maurício", "Gustavo"];

const DEFAULT_TIPOS_PECA = [
  "Bancada", "Balcão", "Testeira", "Encabeçamento", "Montante", "Vira Montante",
  "Respaldo", "Prateleira", "Nicho", "Divibox", "Rodamóvel", "Rodapé",
  "Revestimento", "Piso", "Soleira", "Portal", "Chapim", "Filetes",
  "Mesa", "Painel", "Cuba Esculpida", "Moldura", "Shaft",
];

const DEFAULT_AMBIENTES = [
  "Cozinha", "Área de Serviço", "Lavanderia", "BWC Casal", "BWC Social",
  "BWC Suíte", "BWC Funcional", "Lavabo", "Sala Estar", "Sala Jantar",
  "Sala TV", "Varanda", "Gourmet", "Quarto", "Suíte", "Closet",
  "Escritório", "Hall", "Garagem", "Piscina", "Adega", "Fachada",
];

function emptyPeca(itemNum: number): PecaForm {
  return {
    item: String(itemNum),
    descricao: "",
    quantidade: 1,
    comprimento: "",
    largura: "",
    precisa_45: false,
    precisa_poliborda: false,
    precisa_usinagem: false,
  };
}

function emptyOS(): OSForm {
  return {
    codigo: "",
    ambiente: "",
    material: "",
    projetista: "",
    projetista_outro: "",
    data_entrega: "",
    area_m2: "",
    pecas: [emptyPeca(1)],
  };
}

interface NovaOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NovaOSDialog({ open, onOpenChange, onSuccess }: NovaOSDialogProps) {
  const [cliente, setCliente] = useState<ClienteForm>({
    nome: "", endereco: "", supervisor: "", supervisor_outro: "", contato: "",
  });
  const [osList, setOsList] = useState<OSForm[]>([emptyOS()]);
  const [saving, setSaving] = useState(false);
  const [ambientes, setAmbientes] = useState<string[]>(DEFAULT_AMBIENTES);
  const [tiposPeca, setTiposPeca] = useState<string[]>(DEFAULT_TIPOS_PECA);

  // Load system lists
  useEffect(() => {
    if (!open) return;
    async function load() {
      const { data } = await supabase
        .from("system_lists")
        .select("tipo, valor");
      if (data) {
        const ambList = data.filter((d) => d.tipo === "ambiente").map((d) => d.valor);
        const pecaList = data.filter((d) => d.tipo === "tipo_peca").map((d) => d.valor);
        if (ambList.length > 0) setAmbientes(ambList);
        if (pecaList.length > 0) setTiposPeca(pecaList);
      }
    }
    load();
  }, [open]);

  function reset() {
    setCliente({ nome: "", endereco: "", supervisor: "", supervisor_outro: "", contato: "" });
    setOsList([emptyOS()]);
  }

  function updateOS(idx: number, partial: Partial<OSForm>) {
    setOsList((prev) => prev.map((os, i) => (i === idx ? { ...os, ...partial } : os)));
  }

  function updatePeca(osIdx: number, pecaIdx: number, partial: Partial<PecaForm>) {
    setOsList((prev) =>
      prev.map((os, i) =>
        i === osIdx
          ? {
              ...os,
              pecas: os.pecas.map((p, j) => (j === pecaIdx ? { ...p, ...partial } : p)),
            }
          : os
      )
    );
  }

  function addPeca(osIdx: number) {
    setOsList((prev) =>
      prev.map((os, i) =>
        i === osIdx ? { ...os, pecas: [...os.pecas, emptyPeca(os.pecas.length + 1)] } : os
      )
    );
  }

  function removePeca(osIdx: number, pecaIdx: number) {
    setOsList((prev) =>
      prev.map((os, i) =>
        i === osIdx && os.pecas.length > 1
          ? { ...os, pecas: os.pecas.filter((_, j) => j !== pecaIdx) }
          : os
      )
    );
  }

  function addOS() {
    setOsList((prev) => [...prev, emptyOS()]);
  }

  function removeOS(idx: number) {
    if (osList.length > 1) {
      setOsList((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  async function createSystemListItem(tipo: string, valor: string) {
    await supabase.from("system_lists").insert({ tipo, valor });
    if (tipo === "ambiente") setAmbientes((prev) => [...prev, valor]);
    if (tipo === "tipo_peca") setTiposPeca((prev) => [...prev, valor]);
  }

  async function handleSave() {
    // Validate
    if (!cliente.nome.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    for (let i = 0; i < osList.length; i++) {
      const os = osList[i];
      if (!os.codigo.trim()) {
        toast({ title: `Código da OS ${i + 1} é obrigatório`, variant: "destructive" });
        return;
      }
      if (!os.data_entrega) {
        toast({ title: `Data de entrega da OS ${i + 1} é obrigatória`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Upsert client
      const supervisorFinal = cliente.supervisor === "outro"
        ? cliente.supervisor_outro
        : cliente.supervisor;

      // Check if client exists
      const { data: existingCliente } = await supabase
        .from("clientes")
        .select("id")
        .eq("nome", cliente.nome.trim())
        .maybeSingle();

      let clienteId: string;
      if (existingCliente) {
        clienteId = existingCliente.id;
        await supabase
          .from("clientes")
          .update({
            endereco: cliente.endereco || null,
            supervisor: supervisorFinal || null,
            contato: cliente.contato || null,
          })
          .eq("id", clienteId);
      } else {
        const { data: newCliente, error: clienteError } = await supabase
          .from("clientes")
          .insert({
            nome: cliente.nome.trim(),
            endereco: cliente.endereco || null,
            supervisor: supervisorFinal || null,
            contato: cliente.contato || null,
          })
          .select("id")
          .single();
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
      }

      // 2. Create each OS with its pieces
      for (const os of osList) {
        const projetistaFinal = os.projetista === "outro"
          ? os.projetista_outro
          : os.projetista;

        const { data: newOS, error: osError } = await supabase
          .from("ordens_servico")
          .insert({
            codigo: os.codigo.trim(),
            cliente_id: clienteId,
            ambiente: os.ambiente || null,
            material: os.material || null,
            projetista: projetistaFinal || null,
            data_entrega: os.data_entrega,
            area_m2: os.area_m2 === "" ? null : Number(os.area_m2),
            status: "aguardando_chapa",
            localizacao: "CD",
            data_emissao: new Date().toISOString().split("T")[0],
          })
          .select("id")
          .single();

        if (osError) throw osError;

        // 3. Insert pieces
        const pecasInsert = os.pecas
          .filter((p) => p.descricao.trim())
          .map((p) => ({
            os_id: newOS.id,
            item: p.item,
            descricao: p.descricao,
            quantidade: p.quantidade,
            comprimento: p.comprimento === "" ? null : Number(p.comprimento),
            largura: p.largura === "" ? null : Number(p.largura),
            precisa_45: p.precisa_45,
            precisa_poliborda: p.precisa_poliborda,
            precisa_usinagem: p.precisa_usinagem,
          }));

        if (pecasInsert.length > 0) {
          const { error: pecaError } = await supabase
            .from("pecas")
            .insert(pecasInsert);
          if (pecaError) throw pecaError;
        }
      }

      toast({ title: `${osList.length} OS cadastrada(s) com sucesso!` });
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Client section */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Dados do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={cliente.nome}
                    onChange={(e) => setCliente((c) => ({ ...c, nome: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Endereço</Label>
                  <Input
                    value={cliente.endereco}
                    onChange={(e) => setCliente((c) => ({ ...c, endereco: e.target.value }))}
                    placeholder="Endereço da obra"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supervisor</Label>
                  <Select
                    value={cliente.supervisor}
                    onValueChange={(v) => setCliente((c) => ({ ...c, supervisor: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPERVISORES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {cliente.supervisor === "outro" && (
                    <Input
                      value={cliente.supervisor_outro}
                      onChange={(e) => setCliente((c) => ({ ...c, supervisor_outro: e.target.value }))}
                      placeholder="Nome do supervisor"
                      className="mt-1"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contato</Label>
                  <Input
                    value={cliente.contato}
                    onChange={(e) => setCliente((c) => ({ ...c, contato: e.target.value }))}
                    placeholder="Telefone / email"
                  />
                </div>
              </div>
            </section>

            {/* OS list */}
            {osList.map((os, osIdx) => (
              <section key={osIdx} className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    OS {osIdx + 1}
                  </h3>
                  {osList.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeOS(osIdx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Código *</Label>
                    <Input
                      value={os.codigo}
                      onChange={(e) => updateOS(osIdx, { codigo: e.target.value })}
                      placeholder="OS-2025-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ambiente</Label>
                    <AutocompleteInput
                      value={os.ambiente}
                      onChange={(v) => updateOS(osIdx, { ambiente: v })}
                      options={ambientes}
                      onCreateNew={(v) => createSystemListItem("ambiente", v)}
                      placeholder="Selecione ou crie"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Material</Label>
                    <Input
                      value={os.material}
                      onChange={(e) => updateOS(osIdx, { material: e.target.value })}
                      placeholder="Ex: Quartzito Taj Mahal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Projetista</Label>
                    <Select
                      value={os.projetista}
                      onValueChange={(v) => updateOS(osIdx, { projetista: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJETISTAS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {os.projetista === "outro" && (
                      <Input
                        value={os.projetista_outro}
                        onChange={(e) => updateOS(osIdx, { projetista_outro: e.target.value })}
                        placeholder="Nome do projetista"
                        className="mt-1"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Entrega *</Label>
                    <Input
                      type="date"
                      value={os.data_entrega}
                      onChange={(e) => updateOS(osIdx, { data_entrega: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Área (m²)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={os.area_m2}
                      onChange={(e) =>
                        updateOS(osIdx, { area_m2: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Pieces table */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Peças</Label>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-1.5 px-1 w-12">#</th>
                          <th className="text-left py-1.5 px-1">Descrição</th>
                          <th className="text-left py-1.5 px-1 w-14">Qtd</th>
                          <th className="text-left py-1.5 px-1 w-20">Comp.</th>
                          <th className="text-left py-1.5 px-1 w-20">Larg.</th>
                          <th className="text-center py-1.5 px-1 w-10">45°</th>
                          <th className="text-center py-1.5 px-1 w-10">PB</th>
                          <th className="text-center py-1.5 px-1 w-10">US</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {os.pecas.map((peca, pecaIdx) => (
                          <tr key={pecaIdx} className="border-b last:border-0">
                            <td className="py-1 px-1 text-muted-foreground">{pecaIdx + 1}</td>
                            <td className="py-1 px-1">
                              <AutocompleteInput
                                value={peca.descricao}
                                onChange={(v) => updatePeca(osIdx, pecaIdx, { descricao: v })}
                                options={tiposPeca}
                                onCreateNew={(v) => createSystemListItem("tipo_peca", v)}
                                placeholder="Tipo da peça"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                min={1}
                                value={peca.quantidade}
                                onChange={(e) =>
                                  updatePeca(osIdx, pecaIdx, { quantidade: Number(e.target.value) || 1 })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                value={peca.comprimento}
                                onChange={(e) =>
                                  updatePeca(osIdx, pecaIdx, {
                                    comprimento: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                                placeholder="mm"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                value={peca.largura}
                                onChange={(e) =>
                                  updatePeca(osIdx, pecaIdx, {
                                    largura: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                                placeholder="mm"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1 text-center">
                              <Checkbox
                                checked={peca.precisa_45}
                                onCheckedChange={(v) =>
                                  updatePeca(osIdx, pecaIdx, { precisa_45: !!v })
                                }
                              />
                            </td>
                            <td className="py-1 px-1 text-center">
                              <Checkbox
                                checked={peca.precisa_poliborda}
                                onCheckedChange={(v) =>
                                  updatePeca(osIdx, pecaIdx, { precisa_poliborda: !!v })
                                }
                              />
                            </td>
                            <td className="py-1 px-1 text-center">
                              <Checkbox
                                checked={peca.precisa_usinagem}
                                onCheckedChange={(v) =>
                                  updatePeca(osIdx, pecaIdx, { precisa_usinagem: !!v })
                                }
                              />
                            </td>
                            <td className="py-1 px-1">
                              {os.pecas.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removePeca(osIdx, pecaIdx)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => addPeca(osIdx)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar peça
                  </Button>
                </div>
              </section>
            ))}

            <Button variant="outline" size="sm" onClick={addOS} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar outra OS para este cliente
            </Button>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Salvar {osList.length > 1 ? `${osList.length} OS` : "OS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
