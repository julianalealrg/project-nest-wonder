import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "./AutocompleteInput";
import { Plus, Trash2, Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
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

function emptyPeca(): PecaForm {
  return {
    item: "",
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
    pecas: [emptyPeca()],
  };
}

interface NovaOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NovaOSDialog({ open, onOpenChange, onSuccess }: NovaOSDialogProps) {
  const [mode, setMode] = useState<"manual" | "pdf">("manual");
  const [cliente, setCliente] = useState<ClienteForm>({
    nome: "", endereco: "", supervisor: "", supervisor_outro: "", contato: "",
  });
  const [osList, setOsList] = useState<OSForm[]>([emptyOS()]);
  const [saving, setSaving] = useState(false);
  const [ambientes, setAmbientes] = useState<string[]>(DEFAULT_AMBIENTES);
  const [tiposPeca, setTiposPeca] = useState<string[]>(DEFAULT_TIPOS_PECA);

  // PDF import state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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
    setMode("manual");
    setPdfFile(null);
    setParseSuccess(false);
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
        i === osIdx ? { ...os, pecas: [...os.pecas, emptyPeca()] } : os
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

  // PDF parsing
  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    setPdfFile(file);
    setParsing(true);
    setParseSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-os-pdf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro ao processar PDF" }));
        throw new Error(err.error || "Erro ao processar PDF");
      }

      const result = await response.json();
      const d = result.data;

      if (!d) throw new Error("Nenhum dado extraído do PDF");

      // Fill client data
      if (d.cliente) {
        setCliente((c) => ({ ...c, nome: d.cliente }));
      }
      if (d.supervisor) {
        const match = SUPERVISORES.find(
          (s) => s.toLowerCase() === d.supervisor.toLowerCase()
        );
        if (match) {
          setCliente((c) => ({ ...c, supervisor: match }));
        } else {
          setCliente((c) => ({ ...c, supervisor: "outro", supervisor_outro: d.supervisor }));
        }
      }

      // Fill OS data
      const newOS: OSForm = {
        codigo: d.codigo || "",
        ambiente: d.ambiente || "",
        material: d.material || "",
        projetista: "",
        projetista_outro: "",
        data_entrega: d.data_entrega || "",
        area_m2: d.area_m2 != null ? Number(d.area_m2) : "",
        pecas: [],
      };

      if (d.projetista) {
        const match = PROJETISTAS.find(
          (p) => p.toLowerCase() === d.projetista.toLowerCase()
        );
        if (match) {
          newOS.projetista = match;
        } else {
          newOS.projetista = "outro";
          newOS.projetista_outro = d.projetista;
        }
      }

      // Fill pieces
      if (d.pecas && Array.isArray(d.pecas) && d.pecas.length > 0) {
        newOS.pecas = d.pecas.map((p: any) => ({
          item: p.item || "",
          descricao: p.descricao || "",
          quantidade: p.quantidade || 1,
          comprimento: p.comprimento != null ? Number(p.comprimento) : "",
          largura: p.largura != null ? Number(p.largura) : "",
          precisa_45: false,
          precisa_poliborda: false,
          precisa_usinagem: false,
        }));
      } else {
        newOS.pecas = [emptyPeca()];
      }

      setOsList([newOS]);
      setParseSuccess(true);
      toast({ title: "Dados extraídos do PDF. Confira antes de salvar." });
    } catch (err: any) {
      console.error("PDF parse error:", err);
      toast({ title: "Erro na extração", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handlePdfUpload(file);
    },
    [handlePdfUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handlePdfUpload(file);
    },
    [handlePdfUpload]
  );

  // Upload PDF to storage on save
  async function uploadPdfToStorage(osId: string): Promise<string | null> {
    if (!pdfFile) return null;
    const path = `os-pdfs/${osId}/${pdfFile.name}`;
    const { error } = await supabase.storage.from("evidencias").upload(path, pdfFile, {
      upsert: true,
    });
    if (error) {
      console.error("PDF upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(path);
    return urlData?.publicUrl || null;
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

        // Upload PDF if present
        if (pdfFile && mode === "pdf") {
          const pdfUrl = await uploadPdfToStorage(newOS.id);
          if (pdfUrl) {
            await supabase
              .from("ordens_servico")
              .update({ pdf_url: pdfUrl })
              .eq("id", newOS.id);
          }
        }

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
          {/* Mode tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setMode("manual"); setParseSuccess(false); setPdfFile(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "manual"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <FileText className="h-4 w-4" />
              Preencher manualmente
            </button>
            <button
              onClick={() => setMode("pdf")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "pdf"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Upload className="h-4 w-4" />
              Importar do PDF
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* PDF Upload area (only in PDF mode, before form) */}
            {mode === "pdf" && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? "border-foreground bg-muted/50"
                    : parseSuccess
                    ? "border-green-500 bg-green-50"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Extraindo dados do PDF com IA...</p>
                    <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
                  </div>
                ) : parseSuccess ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <p className="text-sm font-medium text-green-700">
                      Dados extraídos do PDF. Confira antes de salvar.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pdfFile?.name}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPdfFile(null);
                        setParseSuccess(false);
                        setOsList([emptyOS()]);
                        setCliente({ nome: "", endereco: "", supervisor: "", supervisor_outro: "", contato: "" });
                      }}
                    >
                      Enviar outro PDF
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-3 cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Arraste o PDF da OS ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A IA vai extrair automaticamente os dados do cabeçalho e lista de peças
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </label>
                )}
              </div>
            )}

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
                          <th className="text-left py-1.5 px-1 w-16">Item</th>
                          <th className="text-left py-1.5 px-1">Descrição</th>
                          <th className="text-left py-1.5 px-1 w-14">Qtd</th>
                          <th className="text-left py-1.5 px-1 w-24">Comp. (m)</th>
                          <th className="text-left py-1.5 px-1 w-24">Larg. (m)</th>
                          <th className="text-right py-1.5 px-1 w-20">M²</th>
                          <th className="text-center py-1.5 px-1 w-10">45°</th>
                          <th className="text-center py-1.5 px-1 w-10">PB</th>
                          <th className="text-center py-1.5 px-1 w-10">US</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {os.pecas.map((peca, pecaIdx) => (
                          <tr key={pecaIdx} className="border-b last:border-0">
                            <td className="py-1 px-1">
                              <Input
                                value={peca.item}
                                onChange={(e) => updatePeca(osIdx, pecaIdx, { item: e.target.value })}
                                placeholder="1.1"
                                className="h-8 text-xs"
                              />
                            </td>
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
                                step="0.0001"
                                value={peca.comprimento}
                                onChange={(e) =>
                                  updatePeca(osIdx, pecaIdx, {
                                    comprimento: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                                placeholder="1.9400"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="0.0001"
                                value={peca.largura}
                                onChange={(e) =>
                                  updatePeca(osIdx, pecaIdx, {
                                    largura: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                                placeholder="0.3700"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="py-1 px-1 text-right text-xs text-muted-foreground">
                              {peca.comprimento !== "" && peca.largura !== "" 
                                ? (Number(peca.comprimento) * Number(peca.largura) * peca.quantidade).toFixed(4)
                                : "—"}
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
                  {(() => {
                    const totalM2 = os.pecas.reduce((sum, p) => {
                      if (p.comprimento !== "" && p.largura !== "") {
                        return sum + Number(p.comprimento) * Number(p.largura) * p.quantidade;
                      }
                      return sum;
                    }, 0);
                    return totalM2 > 0 ? (
                      <div className="text-xs font-medium text-right text-foreground">
                        M² total: {totalM2.toFixed(4)}
                      </div>
                    ) : null;
                  })()}
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

            {mode === "manual" && (
              <Button variant="outline" size="sm" onClick={addOS} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar outra OS para este cliente
              </Button>
            )}
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
