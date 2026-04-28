import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, X, HardHat, Factory, RefreshCw, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { gerarCodigoOS } from "@/lib/gerarCodigoOS";

const TIPOS_OBRA = [
  "Peça com avaria", "Peça não localizada", "Peça errada", "Medição incorreta",
  "Erro de OS", "Erro de montagem", "Erro de acabamento", "Outro",
];
const TIPOS_FABRICA = [
  "Peça com avaria", "Medição incorreta", "Erro de OS", "Erro de corte", "Erro de acabamento", "Outro",
];
const TIPOS_SOLICITACAO = [
  "Peça não enviada", "Falta de produção", "Falta de recorte/acabamento",
  "Quebra no acabamento", "Quebra no transporte", "Quebra na armazenagem", "Avaria", "Outro",
];

const SUPERVISORES = ["Gino", "Maurício", "Gustavo"];
const PROJETISTAS = ["Letícia", "Lucas", "Rebeca", "Izabeli"];
const PAPEIS_ERRO = ["Medidor", "Montador", "Fornecedor", "Produção", "Projetos", "Cliente"];

interface PecaReg {
  item: string;
  descricao: string;
  quantidade: number;
  medida_atual: string;
  medida_necessaria: string;
  nao_consta_os: boolean;
}

function emptyPeca(): PecaReg {
  return { item: "", descricao: "", quantidade: 1, medida_atual: "", medida_necessaria: "", nao_consta_os: false };
}

interface NovoRegistroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Pré-preencher Número da OS (auto-busca demais campos). */
  presetOsCodigo?: string;
  /** Pré-selecionar origem (ex: 'fabrica' quando vem do botão "Nova ocorrência" da OS). */
  presetOrigem?: "obra" | "fabrica" | "solicitacao";
}

export function NovoRegistroDialog({ open, onOpenChange, onSuccess, presetOsCodigo, presetOrigem }: NovoRegistroDialogProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  // Form state
  const [origem, setOrigem] = useState<"obra" | "fabrica" | "solicitacao" | "">("");
  const [numeroOs, setNumeroOs] = useState("");
  const [osLoading, setOsLoading] = useState(false);
  const [cliente, setCliente] = useState("");
  const [material, setMaterial] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [supervisorOutro, setSupervisorOutro] = useState("");
  const [projetista, setProjetista] = useState("");
  const [projetistaOutro, setProjetistaOutro] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [tipo, setTipo] = useState("");
  const [tipoOutro, setTipoOutro] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [responsavelPapel, setResponsavelPapel] = useState("");
  const [responsavelPapelOutro, setResponsavelPapelOutro] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [acabadorResponsavel, setAcabadorResponsavel] = useState("");
  const [requerRecolha, setRequerRecolha] = useState(false);
  const [recolhaOrigem, setRecolhaOrigem] = useState("");
  const [recolhaDestino, setRecolhaDestino] = useState("");
  const [encaminharProjetos, setEncaminharProjetos] = useState(false);
  const [instrucaoProjetos, setInstrucaoProjetos] = useState("");
  const [pecas, setPecas] = useState<PecaReg[]>([emptyPeca()]);
  const [fotos, setFotos] = useState<File[]>([]);
  const [osId, setOsId] = useState<string | null>(null);
  const [acaoProdutiva, setAcaoProdutiva] = useState<"cortar_nova" | "cortar_retrabalhar" | "apenas_retrabalho" | "nenhuma" | "">("");
  const [materialDisponivel, setMaterialDisponivel] = useState<"sim" | "nao">("sim");

  function reset() {
    setOrigem("");
    setNumeroOs("");
    setCliente("");
    setMaterial("");
    setAmbiente("");
    setSupervisor("");
    setSupervisorOutro("");
    setProjetista("");
    setProjetistaOutro("");
    setUrgencia("");
    setTipo("");
    setTipoOutro("");
    setJustificativa("");
    setResponsavelPapel("");
    setResponsavelPapelOutro("");
    setResponsavelNome("");
    setAcabadorResponsavel("");
    setRequerRecolha(false);
    setRecolhaOrigem("");
    setRecolhaDestino("");
    setEncaminharProjetos(false);
    setInstrucaoProjetos("");
    setPecas([emptyPeca()]);
    setFotos([]);
    setOsId(null);
    setAcaoProdutiva("");
    setMaterialDisponivel("sim");
  }

  // Pré-preenchimento ao abrir (vindo da aba Ocorrências da OS, etc.)
  useEffect(() => {
    if (!open) return;
    if (presetOsCodigo && !numeroOs) setNumeroOs(presetOsCodigo);
    if (presetOrigem && !origem) setOrigem(presetOrigem);
  }, [open, presetOsCodigo, presetOrigem]);

  // Auto-fill from OS
  useEffect(() => {
    if (!numeroOs.trim() || numeroOs.length < 3) return;
    const timeout = setTimeout(async () => {
      setOsLoading(true);
      try {
        const { data } = await supabase
          .from("ordens_servico")
          .select("id, codigo, ambiente, material, projetista, clientes(nome, supervisor)")
          .eq("codigo", numeroOs.trim())
          .maybeSingle();
        if (data) {
          setOsId(data.id);
          setAmbiente(data.ambiente || "");
          setMaterial(data.material || "");
          setProjetista(data.projetista && PROJETISTAS.includes(data.projetista) ? data.projetista : data.projetista ? "outro" : "");
          if (data.projetista && !PROJETISTAS.includes(data.projetista)) setProjetistaOutro(data.projetista);
          const cli = data.clientes as any;
          if (cli) {
            setCliente(cli.nome || "");
            const sup = cli.supervisor;
            setSupervisor(sup && SUPERVISORES.includes(sup) ? sup : sup ? "outro" : "");
            if (sup && !SUPERVISORES.includes(sup)) setSupervisorOutro(sup);
          }
        } else {
          setOsId(null);
        }
      } catch { /* ignore */ }
      setOsLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [numeroOs]);

  const tiposOptions = origem === "obra" ? TIPOS_OBRA : origem === "fabrica" ? TIPOS_FABRICA : origem === "solicitacao" ? TIPOS_SOLICITACAO : [];
  const showResponsavelErro = origem === "obra" || origem === "fabrica";
  const showAcabador = origem === "solicitacao" && tipo === "Quebra no acabamento";

  async function generateCodigo(): Promise<string> {
    const prefix = origem === "obra" ? "OC" : origem === "fabrica" ? "OF" : "REP";
    const year = new Date().getFullYear().toString().slice(-2);
    const codePrefix = `${prefix}${year}-`;

    const { data } = await supabase
      .from("registros")
      .select("codigo")
      .like("codigo", `${codePrefix}%`)
      .order("codigo", { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].codigo.replace(codePrefix, ""), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    return `${codePrefix}${String(nextNum).padStart(3, "0")}`;
  }

  async function handleSave() {
    if (!origem) { toast({ title: "Selecione a origem", variant: "destructive" }); return; }
    if (!numeroOs.trim()) { toast({ title: "Número da OS é obrigatório", variant: "destructive" }); return; }
    if (!cliente.trim()) { toast({ title: "Cliente é obrigatório", variant: "destructive" }); return; }
    if (!material.trim()) { toast({ title: "Material é obrigatório", variant: "destructive" }); return; }
    if (!ambiente.trim()) { toast({ title: "Ambiente é obrigatório", variant: "destructive" }); return; }
    if (!supervisor && !supervisorOutro) { toast({ title: "Supervisor é obrigatório", variant: "destructive" }); return; }
    if (!projetista && !projetistaOutro) { toast({ title: "Projetista é obrigatório", variant: "destructive" }); return; }
    if (!urgencia) { toast({ title: "Urgência é obrigatória", variant: "destructive" }); return; }
    if (!tipo) { toast({ title: "Tipo é obrigatório", variant: "destructive" }); return; }
    if (tipo === "Outro" && !tipoOutro.trim()) { toast({ title: "Descrição do tipo é obrigatória", variant: "destructive" }); return; }
    if (!justificativa.trim()) { toast({ title: "Justificativa é obrigatória", variant: "destructive" }); return; }
    if (showAcabador && !acabadorResponsavel.trim()) { toast({ title: "Acabador responsável é obrigatório", variant: "destructive" }); return; }
    if (encaminharProjetos && !instrucaoProjetos.trim()) { toast({ title: "Instrução para Projetos é obrigatória", variant: "destructive" }); return; }
    if (requerRecolha && (!recolhaOrigem || !recolhaDestino)) { toast({ title: "Origem e destino da recolha são obrigatórios", variant: "destructive" }); return; }
    if (!acaoProdutiva) { toast({ title: "Selecione a ação produtiva", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const codigo = await generateCodigo();
      const supervisorFinal = supervisor === "outro" ? supervisorOutro : supervisor;
      const projetistaFinal = projetista === "outro" ? projetistaOutro : projetista;
      const papelFinal = responsavelPapel === "outro" ? responsavelPapelOutro : responsavelPapel;
      const statusInicial = encaminharProjetos ? "aguardando_os" : "aberto";

      const { data: newReg, error: regError } = await supabase
        .from("registros")
        .insert({
          codigo,
          origem,
          numero_os: numeroOs.trim(),
          os_id: osId,
          cliente: cliente.trim(),
          material: material.trim(),
          ambiente: ambiente.trim(),
          supervisor: supervisorFinal,
          projetista: projetistaFinal,
          aberto_por: profile?.nome || "Sistema",
          tipo: tipo === "Outro" ? "Outro" : tipo,
          tipo_outro: tipo === "Outro" ? tipoOutro : null,
          urgencia,
          status: statusInicial,
          justificativa: justificativa.trim(),
          responsavel_erro_papel: showResponsavelErro ? papelFinal || null : null,
          responsavel_erro_nome: showResponsavelErro ? responsavelNome || null : null,
          acabador_responsavel: showAcabador ? acabadorResponsavel : null,
          encaminhar_projetos: encaminharProjetos,
          instrucao_projetos: encaminharProjetos ? instrucaoProjetos : null,
          requer_recolha: requerRecolha,
          recolha_origem: requerRecolha ? recolhaOrigem : null,
          recolha_destino: requerRecolha ? recolhaDestino : null,
          acao_produtiva: acaoProdutiva,
          material_disponivel: (acaoProdutiva === "cortar_nova" || acaoProdutiva === "cortar_retrabalhar") ? (materialDisponivel === "sim") : null,
        })
        .select("id")
        .single();

      if (regError) throw regError;

      // Insert peças
      const pecasToInsert = pecas.filter((p) => p.descricao.trim());
      if (pecasToInsert.length > 0) {
        const { error: pecaErr } = await supabase.from("registro_pecas").insert(
          pecasToInsert.map((p) => ({
            registro_id: newReg.id,
            item: p.item || null,
            descricao: p.descricao,
            quantidade: p.quantidade,
            medida_atual: p.medida_atual || null,
            medida_necessaria: p.medida_necessaria || null,
            nao_consta_os: p.nao_consta_os,
          }))
        );
        if (pecaErr) throw pecaErr;
      }

      // Upload photos
      if (fotos.length > 0) {
        for (const foto of fotos) {
          const ext = foto.name.split(".").pop();
          const path = `${newReg.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("evidencias")
            .upload(path, foto);
          if (uploadErr) {
            console.error("Upload error:", uploadErr);
            continue;
          }
          const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(path);
          await supabase.from("evidencias").insert({
            registro_id: newReg.id,
            url_foto: urlData.publicUrl,
          });
        }
      }

      // Activity log
      await supabase.from("activity_logs").insert({
        action: "criacao_registro",
        entity_type: "registros",
        entity_id: newReg.id,
        entity_description: codigo,
        user_name: profile?.nome || "Sistema",
        details: { origem, tipo, urgencia },
      });

      // Auto-criar OS de produção a partir do registro, conforme ação produtiva escolhida
      let osGeradaId: string | null = null;
      if (acaoProdutiva !== "nenhuma") {
        try {
          // Status inicial conforme ação
          let statusOS: string;
          let localizacaoOS: string;
          if (acaoProdutiva === "apenas_retrabalho") {
            statusOS = "acabamento";
            localizacaoOS = "Base 2";
          } else {
            // cortar_nova ou cortar_retrabalhar
            statusOS = materialDisponivel === "sim" ? "fila_corte" : "aguardando_material";
            localizacaoOS = materialDisponivel === "sim" ? "Base 1" : "CD";
          }

          // Código da OS gerada herda o prefixo da origem do Registro
          const origemOS = origem === "obra" ? "oc" : origem === "fabrica" ? "of" : "rep";
          const codigoOS = await gerarCodigoOS(origemOS);

          // Resolve cliente_id (pode reutilizar a OS de origem ou criar/buscar pelo nome)
          let clienteIdOS: string | null = null;
          if (osId) {
            const { data: osOrigem } = await supabase
              .from("ordens_servico")
              .select("cliente_id")
              .eq("id", osId)
              .maybeSingle();
            clienteIdOS = osOrigem?.cliente_id || null;
          }
          if (!clienteIdOS && cliente.trim()) {
            const { data: cliExist } = await supabase
              .from("clientes")
              .select("id")
              .ilike("nome", cliente.trim())
              .maybeSingle();
            if (cliExist) {
              clienteIdOS = cliExist.id;
            } else {
              const { data: newCli } = await supabase
                .from("clientes")
                .insert({ nome: cliente.trim(), supervisor: supervisorFinal || null })
                .select("id")
                .single();
              clienteIdOS = newCli?.id || null;
            }
          }

          const { data: newOS, error: osError } = await supabase
            .from("ordens_servico")
            .insert({
              codigo: codigoOS,
              cliente_id: clienteIdOS,
              ambiente: ambiente.trim() || null,
              material: material.trim() || null,
              projetista: projetistaFinal || null,
              status: statusOS,
              localizacao: localizacaoOS,
              origem: origem === "obra" ? "oc" : origem === "fabrica" ? "of" : "rep",
              registro_origem_id: newReg.id,
              material_disponivel: (acaoProdutiva === "cortar_nova" || acaoProdutiva === "cortar_retrabalhar") ? (materialDisponivel === "sim") : null,
              data_emissao: new Date().toISOString().split("T")[0],
            })
            .select("id")
            .single();

          if (osError) throw osError;
          osGeradaId = newOS.id;

          // Copiar peças do registro para a OS gerada (se houver)
          if (pecasToInsert.length > 0) {
            const pecasOS = pecasToInsert.map((p) => {
              // medida_necessaria como "1.20 x 0.60" — tenta extrair
              const med = (p.medida_necessaria || "").toLowerCase();
              const parts = med.split(/[x×*]/).map((s) => parseFloat(s.replace(",", ".").trim()));
              const comprimento = !isNaN(parts[0]) ? parts[0] : null;
              const largura = !isNaN(parts[1]) ? parts[1] : null;
              return {
                os_id: newOS.id,
                item: p.item || null,
                descricao: p.descricao,
                quantidade: p.quantidade,
                comprimento,
                largura,
                // Se for apenas_retrabalho, peças saltam o corte
                status_corte: acaoProdutiva === "apenas_retrabalho" ? "nao_aplicavel" : "pendente",
              };
            });
            await supabase.from("pecas").insert(pecasOS as any);
          }

          // Atualizar registro com os_gerada_id e status "em_producao"
          await supabase
            .from("registros")
            .update({ os_gerada_id: osGeradaId, status: "em_producao" })
            .eq("id", newReg.id);

          // Activity log da OS criada
          await supabase.from("activity_logs").insert({
            action: "os_gerada_de_registro",
            entity_type: "ordens_servico",
            entity_id: osGeradaId,
            entity_description: codigoOS,
            user_name: profile?.nome || "Sistema",
            details: { registro_codigo: codigo, acao_produtiva: acaoProdutiva, status_inicial: statusOS },
          });
        } catch (osErr: any) {
          console.error("Falha ao criar OS automática:", osErr);
          toast({
            title: "Registro criado, mas falhou ao gerar OS",
            description: osErr.message,
            variant: "destructive",
          });
        }
      }

      // Email para Projetos quando encaminhar_projetos = true
      if (encaminharProjetos && projetistaFinal) {
        try {
          // Localiza email do projetista por nome (case-insensitive)
          const { data: projProfile } = await supabase
            .from("profiles")
            .select("email, nome")
            .ilike("nome", projetistaFinal)
            .maybeSingle();

          if (projProfile?.email) {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "ocorrencia-para-projetos",
                recipientEmail: projProfile.email,
                idempotencyKey: `proj-${newReg.id}`,
                templateData: {
                  codigo,
                  cliente: cliente.trim(),
                  numeroOs: numeroOs.trim(),
                  ambiente: ambiente.trim(),
                  urgencia,
                  justificativa: justificativa.trim(),
                  instrucao: instrucaoProjetos.trim(),
                  abertoPor: profile?.nome || "Sistema",
                  projetistaNome: projProfile.nome || projetistaFinal,
                },
              },
            });
          } else {
            console.warn("Projetista sem email cadastrado:", projetistaFinal);
          }
        } catch (emailErr) {
          console.error("Falha ao enviar email para Projetos:", emailErr);
          // Não bloqueia a criação do registro
        }
      }

      toast({ title: `Registro ${codigo} criado com sucesso!` });
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const f of files) {
      if (!ALLOWED.includes(f.type)) {
        rejected.push(`${f.name} (formato inválido — use JPG, PNG ou WEBP)`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        rejected.push(`${f.name} (acima de 10MB)`);
        continue;
      }
      accepted.push(f);
    }

    if (rejected.length > 0) {
      toast({
        title: "Alguns arquivos foram rejeitados",
        description: rejected.join("; "),
        variant: "destructive",
      });
    }
    if (accepted.length > 0) setFotos((prev) => [...prev, ...accepted]);
    e.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Novo Registro</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Origin selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Origem *</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "obra" as const, label: "Ocorrência na Obra", icon: HardHat, color: "border-purple-400 bg-purple-50" },
                  { value: "fabrica" as const, label: "Ocorrência na Fábrica", icon: Factory, color: "border-stone-400 bg-stone-50" },
                  { value: "solicitacao" as const, label: "Solicitação de Reposição", icon: RefreshCw, color: "border-blue-400 bg-blue-50" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setOrigem(opt.value); setTipo(""); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center ${
                      origem === opt.value ? opt.color + " ring-1 ring-offset-1" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <opt.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {origem && (
              <>
                {/* OS + auto-fill */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Número da OS *</Label>
                    <div className="relative">
                      <Input
                        value={numeroOs}
                        onChange={(e) => setNumeroOs(e.target.value)}
                        placeholder="Ex: 1082/25"
                      />
                      {osLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {osId && <p className="text-[10px] text-green-600">✓ OS encontrada — dados preenchidos</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cliente *</Label>
                    <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Material *</Label>
                    <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Ex: Quartzito Taj Mahal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ambiente *</Label>
                    <Input value={ambiente} onChange={(e) => setAmbiente(e.target.value)} placeholder="Ex: Cozinha" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Supervisor *</Label>
                    <Select value={supervisor} onValueChange={setSupervisor}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {SUPERVISORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {supervisor === "outro" && (
                      <Input value={supervisorOutro} onChange={(e) => setSupervisorOutro(e.target.value)} placeholder="Nome" className="mt-1" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Projetista *</Label>
                    <Select value={projetista} onValueChange={setProjetista}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {PROJETISTAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {projetista === "outro" && (
                      <Input value={projetistaOutro} onChange={(e) => setProjetistaOutro(e.target.value)} placeholder="Nome" className="mt-1" />
                    )}
                  </div>
                </div>

                {/* Aberto por */}
                <div className="space-y-1">
                  <Label className="text-xs">Aberto por</Label>
                  <Input value={profile?.nome || "Sistema"} disabled className="bg-muted/50" />
                </div>

                {/* Tipo + urgência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo *</Label>
                    <Select value={tipo} onValueChange={setTipo}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {tiposOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {tipo === "Outro" && (
                      <Input value={tipoOutro} onChange={(e) => setTipoOutro(e.target.value)} placeholder="Descreva o tipo" className="mt-1" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Urgência *</Label>
                    <Select value={urgencia} onValueChange={setUrgencia}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Justificativa */}
                <div className="space-y-1">
                  <Label className="text-xs">Justificativa *</Label>
                  <Textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Descreva o problema em detalhes..."
                    rows={3}
                  />
                </div>

                {/* Responsável pelo erro (obra/fabrica) */}
                {showResponsavelErro && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Responsável pelo erro (papel)</Label>
                      <Select value={responsavelPapel} onValueChange={setResponsavelPapel}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {PAPEIS_ERRO.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      {responsavelPapel === "outro" && (
                        <Input value={responsavelPapelOutro} onChange={(e) => setResponsavelPapelOutro(e.target.value)} placeholder="Qual papel?" className="mt-1" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do responsável</Label>
                      <Input value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} placeholder="Nome (opcional)" />
                    </div>
                  </div>
                )}

                {/* Acabador (solicitação + quebra no acabamento) */}
                {showAcabador && (
                  <div className="space-y-1">
                    <Label className="text-xs">Acabador responsável *</Label>
                    <Input value={acabadorResponsavel} onChange={(e) => setAcabadorResponsavel(e.target.value)} placeholder="Nome do acabador" />
                  </div>
                )}

                {/* Peças */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Peças envolvidas</Label>
                  <div className="space-y-2">
                    {pecas.map((p, i) => (
                      <div key={i} className="grid grid-cols-[50px_1fr_60px_100px_100px_auto_30px] gap-1.5 items-end">
                        <div className="space-y-0.5">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Item</Label>}
                          <Input value={p.item} onChange={(e) => { const np = [...pecas]; np[i] = { ...p, item: e.target.value }; setPecas(np); }} className="h-8 text-xs" placeholder="#" />
                        </div>
                        <div className="space-y-0.5">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Descrição</Label>}
                          <Input value={p.descricao} onChange={(e) => { const np = [...pecas]; np[i] = { ...p, descricao: e.target.value }; setPecas(np); }} className="h-8 text-xs" placeholder="Descrição" />
                        </div>
                        <div className="space-y-0.5">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Qtd</Label>}
                          <Input type="number" min={1} value={p.quantidade} onChange={(e) => { const np = [...pecas]; np[i] = { ...p, quantidade: Number(e.target.value) || 1 }; setPecas(np); }} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-0.5">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Med. Atual</Label>}
                          <Input value={p.medida_atual} onChange={(e) => { const np = [...pecas]; np[i] = { ...p, medida_atual: e.target.value }; setPecas(np); }} className="h-8 text-xs" placeholder="0.000m" />
                        </div>
                        <div className="space-y-0.5">
                          {i === 0 && <Label className="text-[10px] text-muted-foreground">Med. Necessária</Label>}
                          <Input value={p.medida_necessaria} onChange={(e) => { const np = [...pecas]; np[i] = { ...p, medida_necessaria: e.target.value }; setPecas(np); }} className="h-8 text-xs" placeholder="0.000m" />
                        </div>
                        <div className="flex items-center gap-1 h-8">
                          <Checkbox checked={p.nao_consta_os} onCheckedChange={(v) => { const np = [...pecas]; np[i] = { ...p, nao_consta_os: !!v }; setPecas(np); }} />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Não consta OS</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={pecas.length <= 1}
                          onClick={() => setPecas((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setPecas((prev) => [...prev, emptyPeca()])}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar peça
                  </Button>
                </div>

                {/* Fotos */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Evidências fotográficas</Label>
                  <div className="flex flex-wrap gap-2">
                    {fotos.map((f, i) => (
                      <div key={i} className="relative group">
                        <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 object-cover rounded-md border" />
                        <button
                          onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="h-16 w-16 flex flex-col items-center justify-center rounded-md border border-dashed cursor-pointer hover:bg-muted/30 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">Adicionar</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Recolha */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={requerRecolha} onCheckedChange={(v) => setRequerRecolha(!!v)} />
                    <Label className="text-xs">Requer recolha</Label>
                  </div>
                  {requerRecolha && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div className="space-y-1">
                        <Label className="text-xs">Origem *</Label>
                        <Select value={recolhaOrigem} onValueChange={setRecolhaOrigem}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Base 1">Base 1</SelectItem>
                            <SelectItem value="Base 2">Base 2</SelectItem>
                            <SelectItem value="Obra">Obra</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Destino *</Label>
                        <Select value={recolhaDestino} onValueChange={setRecolhaDestino}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Base 1">Base 1</SelectItem>
                            <SelectItem value="Base 2">Base 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Encaminhar para Projetos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={encaminharProjetos} onCheckedChange={(v) => setEncaminharProjetos(!!v)} />
                    <Label className="text-xs">Encaminhar para Projetos</Label>
                  </div>
                  {encaminharProjetos && (
                    <div className="pl-6 space-y-1">
                      <Label className="text-xs">O que Projetos deve fazer *</Label>
                      <Textarea
                        value={instrucaoProjetos}
                        onChange={(e) => setInstrucaoProjetos(e.target.value)}
                        placeholder="Descreva a instrução para o setor de Projetos..."
                        rows={2}
                      />
                      <p className="text-[10px] text-muted-foreground">Status inicial será "Aguardando OS"</p>
                    </div>
                  )}
                </div>

                {/* Ação produtiva */}
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <Label className="text-xs font-semibold">Ação produtiva *</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Define o fluxo de produção que será criado automaticamente para este registro.
                  </p>
                  <RadioGroup
                    value={acaoProdutiva}
                    onValueChange={(v) => setAcaoProdutiva(v as typeof acaoProdutiva)}
                    className="gap-2"
                  >
                    <label className="flex items-start gap-2 cursor-pointer rounded-md border bg-card p-2 hover:bg-muted/40">
                      <RadioGroupItem value="cortar_nova" className="mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Cortar peça nova</p>
                        <p className="text-[11px] text-muted-foreground">Passa por Base 1 completo (corte → acabamento → CQ)</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer rounded-md border bg-card p-2 hover:bg-muted/40">
                      <RadioGroupItem value="cortar_retrabalhar" className="mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Cortar nova + retrabalhar antiga</p>
                        <p className="text-[11px] text-muted-foreground">Base 1 + Base 2</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer rounded-md border bg-card p-2 hover:bg-muted/40">
                      <RadioGroupItem value="apenas_retrabalho" className="mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Apenas retrabalho de acabamento</p>
                        <p className="text-[11px] text-muted-foreground">Pula Base 1 — vai direto para Acabamento (Base 2)</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer rounded-md border bg-card p-2 hover:bg-muted/40">
                      <RadioGroupItem value="nenhuma" className="mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Nenhuma ação produtiva</p>
                        <p className="text-[11px] text-muted-foreground">Apenas registrar a ocorrência — não gera OS</p>
                      </div>
                    </label>
                  </RadioGroup>

                  {(acaoProdutiva === "cortar_nova" || acaoProdutiva === "cortar_retrabalhar") && (
                    <div className="pt-2 border-t space-y-1">
                      <Label className="text-xs">Material disponível? *</Label>
                      <RadioGroup
                        value={materialDisponivel}
                        onValueChange={(v) => setMaterialDisponivel(v as "sim" | "nao")}
                        className="flex gap-4"
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="sim" />
                          <span className="text-xs">Sim — vai para Fila de Corte</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="nao" />
                          <span className="text-xs">Não — aguardando material</span>
                        </label>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !origem}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Salvar Registro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
