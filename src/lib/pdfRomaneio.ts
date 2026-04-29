import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Romaneio } from "@/hooks/useRomaneios";
import { ROTA_LABELS } from "@/hooks/useRomaneios";
import { setupPdfDoc } from "@/lib/pdfSetup";
import { addPdfHeader } from "@/lib/pdfHeader";
import { finalizePdf } from "@/lib/pdfFooter";
import { PDF_COLORS, PDF_FONT, PDF_SIZES, rotaColor } from "@/lib/pdfTheme";

interface RomaneioPdfExtras {
  telefone_destinatario?: string | null;
  userName?: string | null;
}

// Quebra um endereço concatenado em linhas (Rua / Bairro / Cidade-UF / CEP).
// Aceita "Rua X, 123 - Bairro - Cidade/UF - CEP 50000-000" ou variações com vírgula.
function formatEndereco(endereco?: string | null): string[] {
  if (!endereco) return ["—"];
  const raw = endereco.trim();
  // Tenta dividir por " - " (com espaços)
  let parts = raw.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // Sem hífens — tenta vírgulas
    parts = raw.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
  }
  // Se ainda for uma linha só e não tiver separadores, retorna como está
  return parts.length > 1 ? parts : [raw];
}

export function gerarPDFRomaneio(romaneio: Romaneio, extras: RomaneioPdfExtras = {}): { blobUrl: string; fileName: string } {
  const doc = new jsPDF();
  setupPdfDoc(doc);

  let y = addPdfHeader(doc, {
    codigo: romaneio.codigo,
    tipo: "Romaneio",
  });

  // Bloco de rota — estética sóbria alinhada ao RDO/PDF da OS:
  // fundo branco com borda fina e barra lateral colorida (4mm) na cor da rota.
  // Layout DE | seta | PARA com labels uppercase pequenas e nomes em destaque.
  const bannerColor = rotaColor(romaneio.tipo_rota);
  const bannerH = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const bannerX = 14;
  const bannerW = pageW - 28;

  doc.setFillColor(...PDF_COLORS.white);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(bannerX, y, bannerW, bannerH, 1.5, 1.5, "FD");
  doc.setLineWidth(0.2);
  // Barra lateral colorida (4mm)
  doc.setFillColor(...bannerColor);
  doc.rect(bannerX, y, 1.6, bannerH, "F");

  const rotaLabel = ROTA_LABELS[romaneio.tipo_rota] || romaneio.tipo_rota;
  const splitMatch = rotaLabel.split(/\s*(?:→|->)\s*/);
  const contentX = bannerX + 6;
  const contentW = bannerW - 8;

  if (splitMatch.length === 2) {
    const [esq, dir] = splitMatch;
    // Label "ROTA" no canto superior esquerdo
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.small - 1);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text("ROTA", contentX, y + 5);

    // DE [nome] → PARA [nome] em uma linha horizontal centralizada
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.title);
    doc.setTextColor(...PDF_COLORS.text);

    // Calcula larguras pra centralizar o conjunto
    const esqW = doc.getTextWidth(esq);
    const dirW = doc.getTextWidth(dir);
    const setaW = 14;
    const totalW = esqW + 6 + setaW + 6 + dirW;
    const xStart = contentX + (contentW - totalW) / 2;
    const baseY = y + 13;

    doc.text(esq, xStart, baseY);

    // Seta gráfica entre os nomes — usa cor da rota como acento
    const setaY = baseY - 1.5;
    const setaX1 = xStart + esqW + 6;
    const setaX2 = setaX1 + setaW;
    doc.setDrawColor(...bannerColor);
    doc.setLineWidth(0.7);
    doc.line(setaX1, setaY, setaX2 - 2, setaY);
    doc.setFillColor(...bannerColor);
    doc.triangle(setaX2, setaY, setaX2 - 3, setaY - 2, setaX2 - 3, setaY + 2, "F");
    doc.setLineWidth(0.2);

    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.title);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(dir, setaX2 + 6, baseY);
  } else {
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.small - 1);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text("ROTA", contentX, y + 5);
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.title);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(rotaLabel, contentX + contentW / 2, y + 13, { align: "center" });
  }

  doc.setTextColor(...PDF_COLORS.text);
  y += bannerH + 6;

  // Data
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.body);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Data: ${new Date(romaneio.created_at).toLocaleDateString("pt-BR")}`, 14, y);
  y += 6;

  // Bloco destinatário/transporte em 2 colunas
  const enderecoLinhas = formatEndereco(romaneio.endereco_destino);
  const leftBlock: Array<[string, string | string[]]> = [
    ["Endereço destino", enderecoLinhas],
    ["Telefone de contato", extras.telefone_destinatario || "—"],
  ];
  const rightBlock: Array<[string, string]> = [
    ["Motorista", romaneio.motorista || "—"],
    ["Ajudante", romaneio.ajudante || "—"],
  ];

  const startY = y;
  let leftY = y;
  leftBlock.forEach(([label, value]) => {
    doc.setFontSize(PDF_SIZES.small);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.setFont(PDF_FONT, "normal");
    doc.text(label, 14, leftY);
    doc.setFontSize(PDF_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    if (Array.isArray(value)) {
      value.forEach((line, i) => doc.text(line, 14, leftY + 4.5 + i * 4.2));
      leftY += 4.5 + value.length * 4.2 + 2;
    } else {
      doc.text(value, 14, leftY + 4.5);
      leftY += 10;
    }
  });

  let rightY = startY;
  rightBlock.forEach(([label, value]) => {
    doc.setFontSize(PDF_SIZES.small);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(label, 110, rightY);
    doc.setFontSize(PDF_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(value, 110, rightY + 4.5);
    rightY += 10;
  });

  y = Math.max(leftY, rightY) + 4;

  // Tabela de peças
  const isB2Cliente = romaneio.tipo_rota === "base2_cliente";
  const isToCliente = romaneio.tipo_rota === "base2_cliente" || romaneio.tipo_rota === "base1_cliente";

  // Medidas no banco já em metros — render direto com 3 casas
  const fmtMedida = (c: number | null, l: number | null) => {
    if (c == null && l == null) return "—";
    const fmt = (v: number | null) => (v == null ? "—" : Number(v).toFixed(3));
    return `${fmt(c)} × ${fmt(l)}`;
  };

  // Helper pra montar tabela com colunas opcionais (Material só se alguma peça tiver)
  const buildTable = (pecasArr: typeof romaneio.pecas, startY: number) => {
    const temMaterial = pecasArr.some((p) => p.material && p.material.trim());
    const head: string[] = ["#", "Descrição", "Medida (C × L) m"];
    if (temMaterial) head.push("Material");
    head.push("OS", "Conferência");

    const body = pecasArr.map((p) => {
      const row: any[] = [p.peca_item, p.peca_descricao, fmtMedida(p.comprimento, p.largura)];
      if (temMaterial) row.push(p.material || "");
      row.push(p.os_codigo, "");
      return row;
    });

    const colStyles: Record<number, any> = {
      0: { cellWidth: 12 },
      2: { cellWidth: 32, halign: "right" },
    };
    if (temMaterial) {
      colStyles[3] = { cellWidth: 38 };
      colStyles[4] = { cellWidth: 22 };
      colStyles[5] = { cellWidth: 26 };
    } else {
      colStyles[3] = { cellWidth: 22 };
      colStyles[4] = { cellWidth: 26 };
    }

    autoTable(doc, {
      startY,
      head: [head],
      body,
      styles: { fontSize: PDF_SIZES.small + 0.5, cellPadding: 2.5, font: PDF_FONT, textColor: PDF_COLORS.text },
      headStyles: { fillColor: PDF_COLORS.cinzaLight, textColor: PDF_COLORS.text, fontStyle: "bold" },
      columnStyles: colStyles,
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    return (doc as any).lastAutoTable.finalY;
  };

  if (isB2Cliente) {
    const byOs = new Map<string, typeof romaneio.pecas>();
    romaneio.pecas.forEach((p) => {
      const key = p.os_codigo || "—";
      const list = byOs.get(key) || [];
      list.push(p);
      byOs.set(key, list);
    });

    byOs.forEach((pecas, osCodigo) => {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(PDF_SIZES.label);
      doc.setTextColor(...PDF_COLORS.text);
      const material = pecas[0]?.material ? ` — ${pecas[0].material}` : "";
      doc.text(`OS: ${osCodigo} — ${pecas[0]?.cliente_nome || ""}${material}`, 14, y);
      y += 3;
      y = buildTable(pecas, y) + 5;
    });
  } else {
    y = buildTable(romaneio.pecas, y) + 5;
  }

  // Observações / Motivo (se houver)
  if (romaneio.observacoes && romaneio.observacoes.trim()) {
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("Observações / Motivo", 14, y);
    y += 4;
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.body);
    const lines = doc.splitTextToSize(romaneio.observacoes, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.2 + 4;
  }

  // Cláusula de recebimento — próxima ao conteúdo, respeitando margem do rodapé (18mm)
  const pageH = doc.internal.pageSize.getHeight();
  const clauseW = 182;
  const clauseH = 38;
  const maxClauseY = pageH - 18 - clauseH;
  const clauseY = Math.min(y + 6, maxClauseY);

  doc.setFillColor(...PDF_COLORS.cinzaLight);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, clauseY, clauseW, clauseH, 2, 2, "FD");
  // Borda lateral verde (4mm)
  doc.setFillColor(...PDF_COLORS.verde);
  doc.rect(14, clauseY, 1.6, clauseH, "F");
  doc.setLineWidth(0.2);

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.label);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text("Recebimento", 19, clauseY + 6);

  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.small);
  doc.setTextColor(...PDF_COLORS.chumbo);
  const clauseTxt = isToCliente
    ? "Declaro que recebi os itens descritos acima em perfeito estado de conservação, sem avarias, lascas, trincas ou danos aparentes, e em conformidade com o contratado."
    : "Declaro que recebi os itens descritos acima conforme conferência realizada.";
  const clauseLines = doc.splitTextToSize(clauseTxt, clauseW - 10);
  doc.text(clauseLines, 19, clauseY + 11);

  // Linhas de preenchimento
  const baseY = clauseY + clauseH - 8;
  doc.setDrawColor(...PDF_COLORS.muted);
  doc.line(19, baseY, 90, baseY);
  doc.line(95, baseY, 145, baseY);
  doc.line(150, baseY, 192, baseY);
  doc.setFontSize(PDF_SIZES.small);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Responsável recebimento", 54, baseY + 4, { align: "center" });
  doc.text("Assinatura", 120, baseY + 4, { align: "center" });
  doc.text("Data", 171, baseY + 4, { align: "center" });
  doc.setTextColor(...PDF_COLORS.text);

  finalizePdf(doc, { userName: extras.userName });
  const fileName = `${romaneio.codigo}.pdf`;
  const rawBlob = doc.output("blob");
  const blob = new Blob([rawBlob], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, fileName };
}
