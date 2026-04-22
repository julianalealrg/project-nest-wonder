import { useEffect, useMemo, useRef, useState } from "react";
import { X, FileText, ChevronRight, Loader2, Play, ExternalLink } from "lucide-react";
import { gerarPDFOS } from "@/lib/pdfOS";
import { MockOS, MockPeca, STATUS_STEPS, STATUS_MAP, STATUS_LABELS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getNextStatuses, STATUS_LABELS as TRANSITION_LABELS } from "@/lib/statusTransitions";
import { changeOSStatus } from "@/lib/changeOSStatus";
import { advancePecaStation } from "@/lib/advancePeca";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { StatusChangeDialog } from "./StatusChangeDialog";
import { PecaAdvanceDialog, getNextStation } from "./PecaAdvanceDialog";

interface OSPanelProps {
  os: MockOS | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

function StationBadge({ status }: { status: string }) {
  if (status === "concluido" || status === "aprovado") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" title="Concluído" />;
  }
  if (status === "em_andamento") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning animate-pulse" title="Em andamento" />;
  }
  if (status === "reprovado") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" title="Reprovado" />;
  }
  if (status === "nao_aplicavel") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" title="N/A" />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" title="Pendente" />;
}

function ProgressBar({ status }: { status: string }) {
  const idx = STATUS_MAP[status];
  const total = STATUS_STEPS.length;
  const current = idx !== undefined ? idx + 1 : 0;
  const pct = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{STATUS_LABELS[status] || status}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-[10px] overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step}
            className={`text-center text-[10px] leading-tight ${
              i <= (idx ?? -1) ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
            style={{ width: `${100 / total}%` }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function PdfPreview({ pdfUrl, codigo }: { pdfUrl: string; codigo: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      if (!canvasRef.current) return;
      setLoadingPreview(true);
      setPreviewError(null);

      try {
        const pdfjs = await import("pdfjs-dist");
        const workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        renderTaskRef.current?.cancel();

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: false,
          useWorkerFetch: true,
          isEvalSupported: false,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        if (!canvas) {
          await pdf.destroy();
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) {
          await pdf.destroy();
          throw new Error("Canvas não disponível");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        await pdf.destroy();

        if (!cancelled) {
          setLoadingPreview(false);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("PDF preview error:", error);
        setPreviewError("Não foi possível exibir o PDF.");
        setLoadingPreview(false);
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfUrl]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex min-h-[480px] items-center justify-center bg-muted/30 p-3">
          {loadingPreview ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando PDF…
            </div>
          ) : previewError ? (
            <div className="text-center text-[12px] text-muted-foreground">
              <p>{previewError}</p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-foreground underline"
              >
                Clique aqui para abrir <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              aria-label={`Preview do PDF da OS ${codigo}`}
              className="block max-w-full rounded-sm shadow-sm"
            />
          )}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Visualizando a 1ª página.{
