import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blobUrl: string | null;
  fileName: string;
  title?: string;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  blobUrl,
  fileName,
  title = "Visualizar PDF",
}: PdfPreviewDialogProps) {
  // Revoga a URL apenas quando trocar de blobUrl ou desmontar — nunca durante o render.
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  function handleDownload() {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    if (!blobUrl) return;
    const w = window.open(blobUrl);
    if (w) {
      w.addEventListener("load", () => {
        try {
          w.print();
        } catch {
          /* alguns browsers bloqueiam print automático */
        }
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <div className="flex gap-2 mr-8">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!blobUrl}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={!blobUrl}>
              <Download className="h-4 w-4 mr-1" /> Baixar
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-muted/30 overflow-hidden">
          {blobUrl ? (
            <object
              data={blobUrl}
              type="application/pdf"
              className="w-full h-full"
              aria-label={fileName}
            >
              <div className="flex items-center justify-center h-full p-6 text-sm text-muted-foreground text-center">
                <p>
                  Seu navegador não conseguiu exibir o PDF inline.{" "}
                  <a
                    href={blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline font-medium"
                  >
                    Abrir em nova aba
                  </a>{" "}
                  ou use o botão Baixar.
                </p>
              </div>
            </object>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Gerando PDF...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
