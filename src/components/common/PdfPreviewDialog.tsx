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
            <iframe
              src={blobUrl}
              title={fileName}
              className="w-full h-full border-0"
            />
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
