import { useEffect, useState } from "react";
import { X, FileText, CheckCircle, Loader2, Truck } from "lucide-react";
import { gerarPDFRomaneio } from "@/lib/pdfRomaneio";
import { PdfPreviewDialog } from "@/components/common/PdfPreviewDialog";
import { Romaneio, RomaneioPeca, ROTA_LABELS, ROMANEIO_STATUS_LABELS } from "@/hooks/useRomaneios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { romaneioBadgeClass } from "@/lib/statusColors";
import { FotoUploader } from "@/components/common/FotoUploader";
import { uploadFotos, uploadUmaFoto } from "@/lib/uploadFotos";
import { gerarCodigoRegistro } from "@/lib/gerarCodigoRegistro";

interface RomaneioPanelProps {
  romaneio: Romaneio | null;
  onClose: () => void;
  onChanged?: () => void;
  /** Quando true, renderiza dentro de um Dialog centralizado em vez de side-panel. */
  asDialog?: boolean;
}

interface ConferenciaPecaState {
  status: string;
  observacao: string;
  quantidadeAfetada: number;
  fotos: File[];
  fotosSalvas: string[];
}

export function RomaneioPanel({ romaneio, onClose, onChanged, asDialog = false }: RomaneioPanelProps) {
  const [loading, setLoading] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [conferencias, setConferencias] = useState<Record<string, ConferenciaPecaState>>({});
  const [fotoPecas, setFotoPecas] = useState<File[]>([]);
  const [fotoRomaneioAssinado, setFotoRomaneioAssinado] = useState<File[]>([]);
  const [despachando, setDespachando] = useState(false);
  const [fotoCavalete, setFotoCavalete] = useState<File[]>([]);
  const [fotoCarga, setFotoCarga] = useState<File[]>([]);
  const [fotoRomaneioMotorista, setFotoRomaneioMotorista] = useState<File[]>([]);
  const [pdfPreview, setPdfPreview] = useState<{ blobUrl: string; fileName: string } | null>(null);
  const { profile } = useAuth();

  if (!romaneio) return null;

  const canDepart = romaneio.status === "pendente";
  const canReceive = romaneio.status === "em_transito";
  const isB1B2 = romaneio.tipo_rota === "base1_base2";

  function startDespacho() {
    setFotoCavalete([]);
    setFotoCarga([]);
    setFotoRomaneioMotorista([]);
    setDespachando(true);
  }

  async function handleConfirmarDespacho() {
    setLoading(true);
    try {
      let fotoCavaleteUrl: string | null = romaneio!.foto_cavalete_url;
      let fotoCargaUrl: string | null = romaneio!.foto_carga_url;
      let fotoMotoristaUrl: string | null = romaneio!.foto_romaneio_motorista_url;
      if (fotoCavalete.length > 0) {
        fotoCavaleteUrl = (await uploadUmaFoto(fotoCavalete[0], `romaneio/${romaneio!.id}/despacho`)) || fotoCavaleteUrl;
      }
      if (fotoCarga.length > 0) {
        fotoCargaUrl = (await uploadUmaFoto(fotoCarga[0], `romaneio/${romaneio!.id}/despacho`)) || fotoCargaUrl;
      }
      if (fotoRomaneioMotorista.length > 0) {
        fotoMotoristaUrl = (await uploadUmaFoto(fotoRomaneioMotorista[0], `romaneio/${romaneio!.id}/despacho`)) || fotoMotoristaUrl;
      }

      const { error } = await supabase
        .from("romaneios")
        .update({
          status: "em_transito",
          data_saida: new Date().toISOString(),
          foto_cavalete_url: fotoCavaleteUrl,
          foto_carga_url: fotoCargaUrl,
          foto_romaneio_motorista_url: fotoMotoristaUrl,
        })
        .eq("id", romaneio!.id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "despacho_romaneio",
        entity_type: "romaneios",
        entity_id: romaneio!.id,
        entity_description: romaneio!.codigo,
        user_name: profile?.nome || "Sistema",
        details: {
          status: "em_transito",
          tem_foto_cavalete: !!fotoCavaleteUrl,
          tem_foto_carga: !!fotoCargaUrl,
          tem_foto_motorista: !!fotoMotoristaUrl,
        },
      });

      toast({ title: `${romaneio!.codigo} despachado` });
      setDespachando(false);
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function startConferencia() {
    const initial: Record<string, ConferenciaPecaState> = {};
    romaneio!.pecas.forEach((p) => {
      initial[p.id] = {
        status: p.conferencia || "ok",
        observacao: p.observacao || "",
        quantidadeAfetada: p.quantidade,
        fotos: [],
        fotosSalvas: p.fotos || [],
      };
    });
    setConferencias(initial);
    setFotoPecas([]);
    setFotoRomaneioAssinado([]);
    setConferindo(true);
  }

  function updateConferencia(pecaId: string, patch: Partial<ConferenciaPecaState>) {
    setConferencias((prev) => ({
      ...prev,
      [pecaId]: { ...prev[pecaId], ...patch },
    }));
  }

  /**
   * Cria um Registro automático pra peça com problema na conferência.
   * faltou → origem 'solicitacao' (precisa repor)
   * avariada → origem 'fabrica' (problema interno em transporte)
   */
  async function criarRegistroOcorrencia(
    peca: RomaneioPeca,
    estado: ConferenciaPecaState,
    fotosUrls: string[],
  ): Promise<string | null> {
    const origem: "solicitacao" | "fabrica" = estado.status === "faltou" ? "solicitacao" : "fabrica";
    const tipo = estado.status === "faltou" ? "Peça faltante (recebimento B2)" : "Peça avariada em transporte";
    const codigo = await gerarCodigoRegistro(origem);

    // Busca dados auxiliares da OS pra preencher campos obrigatórios
    let ambiente: string | null = null;
    let supervisor: string | null = null;
    let projetista: string | null = null;
    let clienteNome: string | null = peca.cliente_nome || null;
    if (peca.os_id) {
      const { data: os } = await supabase
        .from("ordens_servico")
        .select("ambiente, projetista, clientes ( nome, supervisor )")
        .eq("id", peca.os_id)
        .maybeSingle();
      if (os) {
        ambiente = os.ambiente;
        projetista = os.projetista;
        const cli = (os as any).clientes;
        if (cli) {
          clienteNome = cli.nome || clienteNome;
          supervisor = cli.supervisor;
        }
      }
    }

    const justificativa = estado.observacao.trim() ||
      `${tipo} identificada na conferência do romaneio ${romaneio!.codigo}.`;

    const { data: novoRegistro, error } = await supabase
      .from("registros")
      .insert({
        codigo,
        origem,
        numero_os: peca.os_codigo || "",
        os_id: peca.os_id,
        peca_id: peca.peca_id,
        romaneio_id: romaneio!.id,
        quantidade_afetada: estado.quantidadeAfetada,
        fotos: fotosUrls,
        cliente: clienteNome,
        material: peca.material,
        ambiente,
        supervisor,
        projetista,
        aberto_por: profile?.nome || "Sistema",
        tipo,
        urgencia: "alta",
        status: "aberto",
        justificativa,
      })
      .select("id, codigo")
      .single();

    if (error) {
      console.error(`Falha ao criar registro pra peça ${peca.peca_item}:`, error);
      return null;
    }

    await supabase.from("activity_logs").insert({
      action: "registro_auto_recebimento",
      entity_type: "registros",
      entity_id: novoRegistro.id,
      entity_description: novoRegistro.codigo,
      user_name: profile?.nome || "Sistema",
      details: {
        origem_registro: "conferencia_romaneio",
        romaneio_codigo: romaneio!.codigo,
        peca_item: peca.peca_item,
        os_codigo: peca.os_codigo,
        conferencia: estado.status,
      },
    });

    return novoRegistro.id;
  }

  async function handleConfirmarRecebimento() {
    setLoading(true);
    try {
      const pecasComProblema: { peca: RomaneioPeca; estado: ConferenciaPecaState }[] = [];

      // 1. Upload de fotos por peça com problema + update na conferência
      for (const peca of romaneio!.pecas) {
        const estado = conferencias[peca.id];
        if (!estado) continue;

        let fotosUrls: string[] = [...estado.fotosSalvas];
        if (estado.fotos.length > 0) {
          const novas = await uploadFotos(estado.fotos, `romaneio/${romaneio!.id}/peca/${peca.id}`);
          fotosUrls = [...fotosUrls, ...novas];
        }

        await supabase
          .from("romaneio_pecas")
          .update({
            conferencia: estado.status,
            observacao: estado.observacao || null,
            fotos: fotosUrls,
          })
          .eq("id", peca.id);

        if (estado.status === "faltou" || estado.status === "avariada") {
          pecasComProblema.push({ peca, estado: { ...estado, fotosSalvas: fotosUrls } });
        }
      }

      // 2. Upload das fotos gerais do recebimento
      let fotoPecasUrl: string | null = romaneio!.foto_pecas_armazenadas_url;
      let fotoRomaneioUrl: string | null = romaneio!.foto_romaneio_assinado_url;
      if (fotoPecas.length > 0) {
        fotoPecasUrl = (await uploadUmaFoto(fotoPecas[0], `romaneio/${romaneio!.id}/recebimento`)) || fotoPecasUrl;
      }
      if (fotoRomaneioAssinado.length > 0) {
        fotoRomaneioUrl = (await uploadUmaFoto(fotoRomaneioAssinado[0], `romaneio/${romaneio!.id}/recebimento`)) || fotoRomaneioUrl;
      }

      // 3. Update romaneio
      const { error } = await supabase
        .from("romaneios")
        .update({
          status: "entregue",
          data_recebimento: new Date().toISOString(),
          recebido_por: profile?.nome || "Sistema",
          foto_pecas_armazenadas_url: fotoPecasUrl,
          foto_romaneio_assinado_url: fotoRomaneioUrl,
        })
        .eq("id", romaneio!.id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "recebimento_romaneio",
        entity_type: "romaneios",
        entity_id: romaneio!.id,
        entity_description: romaneio!.codigo,
        user_name: profile?.nome || "Sistema",
        details: {
          conferencias: Object.fromEntries(
            Object.entries(conferencias).map(([k, v]) => [k, v.status]),
          ),
          pecas_com_problema: pecasComProblema.length,
        },
      });

      // 4. Criar Registros automáticos para peças com problema
      const osIdsComProblema = new Set<string>();
      for (const { peca, estado } of pecasComProblema) {
        await criarRegistroOcorrencia(peca, estado, estado.fotosSalvas);
        if (peca.os_id) osIdsComProblema.add(peca.os_id);
      }

      // 5. Avanço automático da OS conforme rota do romaneio recebido.
      // - B1→B2: "enviado_base2" → "acabamento" (só pra OS sem ocorrência pendente)
      // - B2→Cliente: "expedicao" → "entregue" + marca confirmação
      // - B1→Cliente (terceiros direto): "terceiros" → "entregue" + marca confirmação
      const osIds = Array.from(
        new Set(romaneio!.pecas.map((p) => p.os_id).filter(Boolean)),
      ) as string[];
      const osIdsAvancar = osIds.filter((id) => !osIdsComProblema.has(id));

      if (isB1B2 && osIdsAvancar.length > 0) {
        const { data: osParaAtualizar } = await supabase
          .from("ordens_servico")
          .select("id, codigo")
          .in("id", osIdsAvancar)
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

      // Auto-entregue quando romaneio para o cliente é confirmado
      const rotaParaCliente = romaneio!.tipo_rota === "base2_cliente" || romaneio!.tipo_rota === "base1_cliente";
      if (rotaParaCliente && osIdsAvancar.length > 0) {
        const statusOrigem = romaneio!.tipo_rota === "base2_cliente" ? "expedicao" : "terceiros";
        const { data: osParaEntregar } = await supabase
          .from("ordens_servico")
          .select("id, codigo")
          .in("id", osIdsAvancar)
          .eq("status", statusOrigem);

        if (osParaEntregar && osParaEntregar.length > 0) {
          const ids = osParaEntregar.map((o) => o.id);
          const agora = new Date().toISOString();
          await supabase
            .from("ordens_servico")
            .update({
              status: "entregue",
              localizacao: "Cliente",
              entregue_confirmado_em: agora,
              entregue_confirmado_por: profile?.nome || "Sistema",
              updated_at: agora,
            } as any)
            .in("id", ids);

          const logs = osParaEntregar.map((o) => ({
            action: "avanco_automatico_pos_recebimento",
            entity_type: "ordens_servico",
            entity_id: o.id,
            entity_description: o.codigo,
            user_name: profile?.nome || "Sistema",
            details: {
              from_status: statusOrigem,
              to_status: "entregue",
              romaneio_id: romaneio!.id,
              romaneio_codigo: romaneio!.codigo,
              tipo_rota: romaneio!.tipo_rota,
            },
          }));
          await supabase.from("activity_logs").insert(logs);
        }
      }

      const msg = pecasComProblema.length > 0
        ? `${romaneio!.codigo} recebido. ${pecasComProblema.length} ocorrência(s) registrada(s).`
        : `${romaneio!.codigo} recebido com sucesso`;
      toast({ title: msg });
      setConferindo(false);
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const headerNode = (
    <div className="flex items-center justify-between px-5 py-4 border-b">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{romaneio.codigo}</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${romaneioBadgeClass(romaneio.status)}`}>
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

      {/* Fotos do despacho (somente quando já saiu da B1) */}
      {(romaneio.foto_cavalete_url || romaneio.foto_carga_url || romaneio.foto_romaneio_motorista_url) && !despachando && (
        <>
          <Separator />
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Despacho</h3>
            <div className="flex gap-2">
              {romaneio.foto_cavalete_url && (
                <a href={romaneio.foto_cavalete_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={romaneio.foto_cavalete_url} alt="Cavalete" className="h-20 w-20 object-cover rounded border" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Cavalete</p>
                </a>
              )}
              {romaneio.foto_carga_url && (
                <a href={romaneio.foto_carga_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={romaneio.foto_carga_url} alt="Carga" className="h-20 w-20 object-cover rounded border" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Carga</p>
                </a>
              )}
              {romaneio.foto_romaneio_motorista_url && (
                <a href={romaneio.foto_romaneio_motorista_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={romaneio.foto_romaneio_motorista_url} alt="Romaneio motorista" className="h-20 w-20 object-cover rounded border" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Motorista</p>
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bloco de upload de fotos do despacho (somente em modo despacho) */}
      {despachando && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fotos do despacho (opcionais)</h3>
            <div>
              <Label className="text-xs">Cavalete (conferência B1)</Label>
              <FotoUploader
                fotos={fotoCavalete}
                onChange={setFotoCavalete}
                fotosSalvas={romaneio.foto_cavalete_url ? [romaneio.foto_cavalete_url] : []}
                multiple={false}
                size="sm"
                label="Foto cavalete"
              />
            </div>
            <div>
              <Label className="text-xs">Carga no caminhão</Label>
              <FotoUploader
                fotos={fotoCarga}
                onChange={setFotoCarga}
                fotosSalvas={romaneio.foto_carga_url ? [romaneio.foto_carga_url] : []}
                multiple={false}
                size="sm"
                label="Foto carga"
              />
            </div>
            <div>
              <Label className="text-xs">Romaneio assinado pelo motorista</Label>
              <FotoUploader
                fotos={fotoRomaneioMotorista}
                onChange={setFotoRomaneioMotorista}
                fotosSalvas={romaneio.foto_romaneio_motorista_url ? [romaneio.foto_romaneio_motorista_url] : []}
                multiple={false}
                size="sm"
                label="Foto motorista"
              />
            </div>
          </div>
        </>
      )}

      {/* Fotos do recebimento (somente quando já entregue) */}
      {(romaneio.foto_pecas_armazenadas_url || romaneio.foto_romaneio_assinado_url) && !conferindo && (
        <>
          <Separator />
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recebimento</h3>
            <div className="flex gap-2">
              {romaneio.foto_pecas_armazenadas_url && (
                <a href={romaneio.foto_pecas_armazenadas_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={romaneio.foto_pecas_armazenadas_url} alt="Peças armazenadas" className="h-20 w-20 object-cover rounded border" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Peças</p>
                </a>
              )}
              {romaneio.foto_romaneio_assinado_url && (
                <a href={romaneio.foto_romaneio_assinado_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={romaneio.foto_romaneio_assinado_url} alt="Romaneio assinado" className="h-20 w-20 object-cover rounded border" />
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">Romaneio</p>
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bloco de upload de fotos gerais (somente em modo conferência) */}
      {conferindo && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fotos do recebimento</h3>
            <div>
              <Label className="text-xs">Peças armazenadas</Label>
              <FotoUploader
                fotos={fotoPecas}
                onChange={setFotoPecas}
                fotosSalvas={romaneio.foto_pecas_armazenadas_url ? [romaneio.foto_pecas_armazenadas_url] : []}
                multiple={false}
                size="sm"
                label="Foto peças"
              />
            </div>
            <div>
              <Label className="text-xs">Romaneio assinado</Label>
              <FotoUploader
                fotos={fotoRomaneioAssinado}
                onChange={setFotoRomaneioAssinado}
                fotosSalvas={romaneio.foto_romaneio_assinado_url ? [romaneio.foto_romaneio_assinado_url] : []}
                multiple={false}
                size="sm"
                label="Foto romaneio"
              />
            </div>
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
          {romaneio.pecas.map((p) => {
            const hasMedida = p.comprimento != null || p.largura != null;
            const fmt = (v: number | null | undefined) =>
              v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
            const estado = conferencias[p.id];
            const showProblemaUI = conferindo && estado && (estado.status === "faltou" || estado.status === "avariada");
            return (
              <div key={p.id} className="rounded-md bg-muted/30 text-sm">
                <div className="flex items-start gap-3 p-2.5">
                  <span className="font-medium text-foreground w-10 text-center pt-0.5">{p.peca_item}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground">{p.peca_descricao}</div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {hasMedida && (
                        <span>{fmt(p.comprimento)} × {fmt(p.largura)} m</span>
                      )}
                      {p.material && <span>— {p.material}</span>}
                      {p.os_codigo && <span>— OS {p.os_codigo}</span>}
                      <span>— qtd {p.quantidade}</span>
                    </div>
                  </div>
                  {conferindo ? (
                    <Select
                      value={estado?.status || "ok"}
                      onValueChange={(v) => updateConferencia(p.id, { status: v })}
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
                {/* Bloco extra quando peça está marcada como faltou/avariada */}
                {showProblemaUI && (
                  <div className="border-t bg-background/40 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px]">Quantidade afetada</Label>
                        <Input
                          type="number"
                          min={1}
                          max={p.quantidade}
                          className="h-7 text-xs"
                          value={estado.quantidadeAfetada}
                          onChange={(e) => updateConferencia(p.id, { quantidadeAfetada: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground self-end pb-1">
                        {estado.status === "faltou" ? "Vai gerar Solicitação de Reposição" : "Vai gerar Ocorrência de Fábrica"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px]">Observação</Label>
                      <Textarea
                        rows={2}
                        className="text-xs"
                        placeholder="Ex: faltou peça do tampo / quebrou no canto direito"
                        value={estado.observacao}
                        onChange={(e) => updateConferencia(p.id, { observacao: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Fotos da evidência</Label>
                      <FotoUploader
                        fotos={estado.fotos}
                        onChange={(fs) => updateConferencia(p.id, { fotos: fs })}
                        fotosSalvas={estado.fotosSalvas}
                        onRemoverSalva={(url) => updateConferencia(p.id, { fotosSalvas: estado.fotosSalvas.filter((u) => u !== url) })}
                        size="sm"
                        label="Foto"
                      />
                    </div>
                  </div>
                )}
                {/* Visualização de observação + fotos quando já recebido */}
                {!conferindo && (p.observacao || (p.fotos && p.fotos.length > 0)) && (p.conferencia === "faltou" || p.conferencia === "avariada") && (
                  <div className="border-t bg-background/40 p-2 space-y-1.5">
                    {p.observacao && <p className="text-xs text-foreground">{p.observacao}</p>}
                    {p.fotos && p.fotos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.fotos.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="h-12 w-12 object-cover rounded border" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const footerNode = (
    <div className="border-t px-5 py-3 flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={() => setPdfPreview(gerarPDFRomaneio(romaneio))}>
        <FileText className="h-4 w-4 mr-1" /> Gerar PDF
      </Button>
      {canDepart && !despachando && (
        <Button size="sm" className="flex-1" onClick={startDespacho}>
          <Truck className="h-4 w-4 mr-1" /> Despachar
        </Button>
      )}
      {despachando && (
        <Button size="sm" className="flex-1" disabled={loading} onClick={handleConfirmarDespacho}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Truck className="h-4 w-4 mr-1" />}
          Confirmar despacho
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

  const pdfDialog = (
    <PdfPreviewDialog
      open={!!pdfPreview}
      onOpenChange={(v) => { if (!v) setPdfPreview(null); }}
      blobUrl={pdfPreview?.blobUrl || null}
      fileName={pdfPreview?.fileName || "documento.pdf"}
      title={`PDF — ${romaneio.codigo}`}
    />
  );

  if (asDialog) {
    return (
      <>
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
            {headerNode}
            {bodyNode}
            {footerNode}
          </DialogContent>
        </Dialog>
        {pdfDialog}
      </>
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
      {pdfDialog}
    </>
  );
}
