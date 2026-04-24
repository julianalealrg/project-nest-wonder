import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Palette } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { useQueryClient } from "@tanstack/react-query";
import { STATUS_LABELS } from "@/data/mockProducao";
import { osBadgeClass } from "@/lib/statusColors";
import { gerarPDFOS } from "@/lib/pdfOS";
import { PdfPreviewDialog } from "@/components/common/PdfPreviewDialog";
import { OSDetalheGeral } from "@/components/producao/detalhe/OSDetalheGeral";
import { OSDetalhePecas } from "@/components/producao/detalhe/OSDetalhePecas";
import { OSDetalheRomaneios } from "@/components/producao/detalhe/OSDetalheRomaneios";
import { OSDetalheHistorico } from "@/components/producao/detalhe/OSDetalheHistorico";
import { getOrigemTagInfo } from "@/lib/origemTag";

function getOrigemTag(origem: string) {
  const tag = getOrigemTagInfo(origem);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.badgeClass}`}>
      {tag.label}
    </span>
  );
}

export default function OSDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: osList = [], isLoading } = useOrdensServico();
  const [pdfPreview, setPdfPreview] = useState<{ blobUrl: string; fileName: string } | null>(null);

  useRealtimeInvalidate([
    { table: "ordens_servico", queryKeys: [["ordens_servico"], ["home-kpis"]] },
    { table: "pecas", queryKeys: [["ordens_servico"]] },
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

  const headerAction = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => navigate("/producao")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar
      </Button>
      <Button size="sm" variant="outline" onClick={() => setPdfPreview(gerarPDFOS(os))}>
        <FileText className="mr-1 h-4 w-4" />
        Gerar PDF
      </Button>
    </div>
  );

  return (
    <AppLayout title={os.codigo} action={headerAction}>
      <div className="space-y-5">
        {/* Header da OS */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {getOrigemTag(os.origem)}
            <h2 className="text-lg font-semibold text-foreground">{os.codigo}</h2>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground">{os.cliente}</span>
            {os.registro_origem_aguarda_projetos && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-100 text-purple-700">
                <Palette className="h-2.5 w-2.5" /> Aguardando Projetos
              </span>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${osBadgeClass(os.status)}`}>
                {STATUS_LABELS[os.status] || os.status}
              </span>
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Área</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{os.area_m2} m²</p>
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
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Base atual</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{os.localizacao || "—"}</p>
          </div>
          <div className="col-span-2 rounded-lg border bg-card p-3 md:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peças</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {donePecas}/{totalPecas} <span className="text-muted-foreground font-normal">({pctPecas}%)</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="pecas">Peças ({totalPecas})</TabsTrigger>
            <TabsTrigger value="romaneios">Romaneios ({os.romaneios.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalheGeral os={os} onStatusChanged={handleRefresh} />
          </TabsContent>

          <TabsContent value="pecas" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalhePecas os={os} onStatusChanged={handleRefresh} />
          </TabsContent>

          <TabsContent value="romaneios" className="mt-4 rounded-lg border bg-card p-5">
            <OSDetalheRomaneios os={os} onStatusChanged={handleRefresh} />
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
