import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { useQueryClient } from "@tanstack/react-query";
import { gerarPDFOSCompleto } from "@/lib/pdfOS";
import { PdfPreviewDialog } from "@/components/common/PdfPreviewDialog";
import { OSDetalheHeader } from "@/components/producao/detalhe/OSDetalheHeader";
import { OSDetalheOperacao } from "@/components/producao/detalhe/OSDetalheOperacao";
import { OSDetalheOcorrencias } from "@/components/producao/detalhe/OSDetalheOcorrencias";
import { OSDetalheHistorico } from "@/components/producao/detalhe/OSDetalheHistorico";
import { OSDetalheLinhaDoTempo } from "@/components/producao/detalhe/OSDetalheLinhaDoTempo";
import { tempoEmProducaoMs, formatDuracao } from "@/lib/tempoEstacao";

export default function OSDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: osList = [], isLoading } = useOrdensServico();
  const [pdfPreview, setPdfPreview] = useState<{ blobUrl: string; fileName: string } | null>(null);

  useRealtimeInvalidate([
    { table: "ordens_servico", queryKeys: [["ordens_servico"], ["home-kpis"]] },
    { table: "pecas", queryKeys: [["ordens_servico"]] },
    { table: "registros", queryKeys: [["ordens_servico"]] },
    { table: "activity_logs", queryKeys: [["activity_logs", "ordens_servico", id || ""]] },
  ]);

  const os = useMemo(() => osList.find((o) => o.id === id) || null, [osList, id]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["activity_logs", "ordens_servico", id] });
  }

  if (isLoading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando OS...
        </div>
      </AppLayout>
    );
  }

  if (!os) {
    return (
      <AppLayout title="OS não encontrada">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground">A OS solicitada não existe ou foi removida.</p>
          <Button onClick={() => navigate("/producao")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para Produção
          </Button>
        </div>
      </AppLayout>
    );
  }

  const donePecas = os.pecas.filter((p) => p.status_cq === "aprovado").length;
  const totalPecas = os.pecas.length;
  const pctPecas = totalPecas > 0 ? Math.round((donePecas / totalPecas) * 100) : 0;
  const dataEntrega = os.data_entrega ? new Date(os.data_entrega) : null;
  const diasRestantes = dataEntrega ? Math.ceil((dataEntrega.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const ocorrenciasPendentes = (os.registros || []).filter(
    (r) => r.status !== "resolvido" && !r.acao_produtiva,
  ).length;

  const headerAction = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => navigate("/producao")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar
      </Button>
      <Button size="sm" variant="outline" onClick={async () => setPdfPreview(await gerarPDFOSCompleto(os))}>
        <FileText className="mr-1 h-4 w-4" />
        Gerar PDF
      </Button>
    </div>
  );

  return (
    <AppLayout title={os.codigo} action={headerAction}>
      <div className="space-y-5">
        {/* Header novo (substitui o card antigo + parte da aba Geral) */}
        <OSDetalheHeader os={os} onStatusChanged={handleRefresh} />

        {/* Cards de resumo — info recorrente */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Material</p>
            <p className="mt-1 text-sm font-medium text-foreground truncate" title={os.material || "—"}>{os.material || "—"}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Área</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{Number(os.area_m2 ?? 0).toFixed(2)} m²</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em produção</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {os.status === "entregue"
                ? "—"
                : formatDuracao(tempoEmProducaoMs(os))}
            </p>
            {os.data_emissao && (
              <p className="text-[10px] text-muted-foreground">
                desde {new Date(os.data_emissao).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prazo</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {dataEntrega ? dataEntrega.toLocaleDateString("pt-BR") : "—"}
            </p>
            {diasRestantes !== null && os.status !== "entregue" && (
              <p className={`text-[10px] ${diasRestantes < 0 ? "text-destructive" : diasRestantes <= 10 ? "text-nue-amarelo" : "text-muted-foreground"}`}>
                {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d em atraso` : `${diasRestantes}d restantes`}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peças</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {donePecas}/{totalPecas} <span className="text-muted-foreground font-normal">({pctPecas}%)</span>
            </p>
          </div>
        </div>

        {/* Tabs reorganizadas: Operação (peças + romaneios + timeline) / Ocorrências / Histórico */}
        <Tabs defaultValue="operacao" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="operacao">Operação</TabsTrigger>
            <TabsTrigger value="linha_tempo">Linha do tempo</TabsTrigger>
            <TabsTrigger value="ocorrencias">
              Ocorrências{ocorrenciasPendentes > 0 ? (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {ocorrenciasPendentes}
                </span>
              ) : os.registros && os.registros.length > 0 ? (
                <span className="ml-1.5 text-[11px] text-muted-foreground">({os.registros.length})</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="operacao" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalheOperacao os={os} onStatusChanged={handleRefresh} />
          </TabsContent>

          <TabsContent value="linha_tempo" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalheLinhaDoTempo os={os} />
          </TabsContent>

          <TabsContent value="ocorrencias" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalheOcorrencias os={os} onChanged={handleRefresh} />
          </TabsContent>

          <TabsContent value="historico" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalheHistorico osId={os.id} />
          </TabsContent>
        </Tabs>
      </div>

      <PdfPreviewDialog
        open={!!pdfPreview}
        onOpenChange={(v) => { if (!v) setPdfPreview(null); }}
        blobUrl={pdfPreview?.blobUrl || null}
        fileName={pdfPreview?.fileName || "documento.pdf"}
        title={`PDF — ${os.codigo}`}
      />
    </AppLayout>
  );
}
