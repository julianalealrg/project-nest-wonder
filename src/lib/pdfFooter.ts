// Shared PDF footer + watermark.
// Aplica em todas as páginas: rodapé com data/hora + autor + URL e paginação.
// Watermark "NUE PROJETOS" central rotacionado 45° com opacidade ~7%.
import jsPDF from "jspdf";
import { PDF_COLORS, PDF_FONT, PDF_SIZES } from "@/lib/pdfTheme";

export interface PdfFooterOptions {
  /** Nome do usuário que gerou o PDF (cai pra "Sistema" se vazio) */
  userName?: string | null;
}

/**
 * Aplica watermark + rodapé em TODAS as páginas do documento.
 * Chamar UMA VEZ ao final, depois de adicionar todo o conteúdo.
 */
export function finalizePdf(doc: jsPDF, opts: PdfFooterOptions = {}) {
  const total = (doc.internal as any).getNumberOfPages();
  const author = opts.userName?.trim() || "Sistema";
  const now = new Date();
  const stamp =
    now.toLocaleDateString("pt-BR") +
    " " +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total, stamp, author);
  }
}

function addFooter(doc: jsPDF, page: number, total: number, stamp: string, author: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 8;

  // Linha fina separadora
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(14, y - 4, pageW - 14, y - 4);

  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.small);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Gerado em ${stamp} por ${author} — pcp.nueprojetos.com.br`, 14, y);
  doc.text(`Página ${page} de ${total}`, pageW - 14, y, { align: "right" });
  doc.setTextColor(...PDF_COLORS.text);
}
