// Shared PDF header — logo NUE + código + tipo do documento + linha separadora.
// Removido "Marmoraria Premium — Recife/PE" conforme requisito.
import jsPDF from "jspdf";
import { PDF_COLORS, PDF_FONT, PDF_SIZES } from "@/lib/pdfTheme";
// Importa o data URI do logo já existente no pdfSetup.ts (re-exportado abaixo)
import { NUE_LOGO_DATA } from "@/lib/pdfLogo";

export interface PdfHeaderOptions {
  /** Código do documento (ex.: "0132/26-12/R00") */
  codigo: string;
  /** Tipo do documento ("Ordem de Produção", "Romaneio", "Ocorrência") */
  tipo: string;
  /** Pills opcionais ao lado do código (ex.: [{ label: "OBRA", color: [...] }]) */
  pills?: Array<{ label: string; color: [number, number, number] }>;
}

const HEADER_BOTTOM_Y = 36; // mm — onde termina o header

/**
 * Renderiza o header padronizado e devolve o Y da próxima linha utilizável.
 * Logo à esquerda (altura 12mm), código + tipo à direita, "NUE Projetos" embaixo,
 * linha fina cinza separando do corpo.
 */
export function addPdfHeader(doc: jsPDF, opts: PdfHeaderOptions): number {
  // Logo (mantém aspect ratio 16:9)
  const logoH = 12;
  const logoW = logoH * (1920 / 1080);
  doc.addImage(NUE_LOGO_DATA, "PNG", 14, 8, logoW, logoH);

  // Texto "NUE Projetos" abaixo do logo, fonte 10pt, cor chumbo
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.label);
  doc.setTextColor(...PDF_COLORS.chumbo);
  doc.text("NUE Projetos", 14, 27);
  doc.setTextColor(...PDF_COLORS.text);

  // Bloco direito: tipo (label pequeno) + código (destaque)
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.label);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(opts.tipo, 196, 13, { align: "right" });

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.heading);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(opts.codigo, 196, 21, { align: "right" });

  // Pills (origem/urgência/status) — alinhados à direita, embaixo do código
  if (opts.pills && opts.pills.length > 0) {
    let pillX = 196;
    const pillY = 25;
    const pillH = 5;
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.small - 1);
    // Renderiza da direita para a esquerda
    for (let i = opts.pills.length - 1; i >= 0; i--) {
      const p = opts.pills[i];
      const txtW = doc.getTextWidth(p.label);
      const pillW = txtW + 4;
      doc.setFillColor(...p.color);
      doc.roundedRect(pillX - pillW, pillY, pillW, pillH, 1, 1, "F");
      doc.setTextColor(...PDF_COLORS.white);
      doc.text(p.label, pillX - pillW / 2, pillY + 3.6, { align: "center" });
      pillX -= pillW + 2;
    }
    doc.setTextColor(...PDF_COLORS.text);
  }

  // Linha separadora 0.3mm
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(14, HEADER_BOTTOM_Y - 2, 196, HEADER_BOTTOM_Y - 2);
  doc.setLineWidth(0.2); // restaura padrão

  return HEADER_BOTTOM_Y + 4;
}

export const HEADER_END_Y = HEADER_BOTTOM_Y;
