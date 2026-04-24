import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MockOS } from "@/data/mockProducao";
import { setupPdfDoc } from "@/lib/pdfSetup";
import { addPdfHeader } from "@/lib/pdfHeader";
import { finalizePdf } from "@/lib/pdfFooter";
import { PDF_COLORS, PDF_FONT, PDF_SIZES, destinoColor } from "@/lib/pdfTheme";

interface OSPdfExtras {
  prioridade?: string | null;
  urgencia?: "baixa" | "media" | "alta" | "critica" | string | null;
  instrucao_producao?: string | null;
  userName?: string | null;
}

const URG_LABEL: Record<string, string> = {
  critica: "CRÍTICA",
  alta: "ALTA",
  media: "MÉDIA",
  baixa: "BAIXA",
};

const URG_COLOR: Record<string, [number, number, number]> = {
  critica: PDF_COLORS.vermelho,
  alta: PDF_COLORS.vermelho,
  media: PDF_COLORS.amarelo,
  baixa: PDF_COLORS.verde,
};

export function gerarPDFOS(os: MockOS, extras: OSPdfExtras = {}) {
  const doc = new jsPDF();
  setupPdfDoc(doc);

  const pills: Array<{ label: string; color: [number, number, number] }> = [];
  if (extras.urgencia) {
    pills.push({
      label: URG_LABEL[extras.urgencia] || String(extras.urgencia).toUpperCase(),
      color: URG_COLOR[extras.urgencia] || PDF_COLORS.muted,
    });
  }

  let y = addPdfHeader(doc, {
    codigo: os.codigo,
    tipo: "Ordem de Produção",
    pills,
  });

  // Grid de dados em 2 colunas compactas — omite Prioridade/Urgência se vazias
  const items: [string, string][] = [
    ["Cliente", os.cliente],
    ["Material", os.material],
    ["Ambiente", os.ambiente],
    ["Supervisor", os.supervisor],
    ["Projetista", os.projetista],
    ["Data Entrega", os.data_entrega ? new Date(os.data_entrega).toLocaleDateString("pt-BR") : "—"],
  ];
  if (extras.prioridade && extras.prioridade.trim()) {
    items.push(["Prioridade", extras.prioridade]);
  }
  if (extras.urgencia) {
    items.push(["Urgência", URG_LABEL[extras.urgencia] || String(extras.urgencia)]);
  }

  const colW = 91;
  const rowH = 10;
  items.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * colW;
    const cy = y + row * rowH;
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.small);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(label, x, cy);
    doc.setFontSize(PDF_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(value || "—", x, cy + 4.5);
  });
  y += Math.ceil(items.length / 2) * rowH + 2;

  // Caixa de Instrução de produção (se houver)
  if (extras.instrucao_producao && extras.instrucao_producao.trim()) {
    const boxX = 14;
    const boxW = 182;
    const padding = 4;
    const lines = doc.splitTextToSize(extras.instrucao_producao, boxW - padding * 2 - 8);
    const boxH = Math.max(14, lines.length * 4.2 + padding * 2 + 4);

    doc.setFillColor(...PDF_COLORS.amareloLight);
    doc.setDrawColor(...PDF_COLORS.amarelo);
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");

    // Ícone alerta (triângulo simples)
    doc.setFillColor(...PDF_COLORS.amarelo);
    doc.triangle(boxX + 4, y + boxH / 2 + 2.5, boxX + 8, y + boxH / 2 + 2.5, boxX + 6, y + boxH / 2 - 2, "F");
    doc.setFontSize(PDF_SIZES.small);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("!", boxX + 6, y + boxH / 2 + 1.5, { align: "center" });

    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("Instrução de produção", boxX + 12, y + 6);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.body);
    doc.text(lines, boxX + 12, y + 11);
    y += boxH + 4;
    doc.setLineWidth(0.2);
  }

  // Tabela de peças
  doc.setDrawColor(...PDF_COLORS.border);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.label);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Peças (${os.pecas.length})`, 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [["#", "Descrição", "Comp. (m)", "Larg. (m)", "Qtd", "Material", "Obs"]],
    body: os.pecas.map((p) => [
      p.item,
      p.descricao,
      p.comprimento != null ? Number(p.comprimento).toFixed(3) : "—",
      p.largura != null ? Number(p.largura).toFixed(3) : "—",
      String(p.quantidade),
      os.material || "—",
      [p.precisa_45 && "45°", p.precisa_poliborda && "Polib.", p.precisa_usinagem && "Usin."]
        .filter(Boolean)
        .join(", ") || "—",
    ]),
    styles: { fontSize: PDF_SIZES.small, cellPadding: 2, font: PDF_FONT, textColor: PDF_COLORS.text },
    headStyles: {
      fillColor: PDF_COLORS.cinzaLight,
      textColor: PDF_COLORS.text,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 12, halign: "right" },
      5: { cellWidth: 38 },
    },
    theme: "grid",
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Observações adicionais (área livre)
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.label);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text("Observações adicionais", 14, y);
  y += 3;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 22, 1.5, 1.5, "S");
  y += 26;
  doc.setLineWidth(0.2);

  // Badge colorido grande de destino — fixado no rodapé da página 1
  const pageH = doc.internal.pageSize.getHeight();
  const destY = pageH - 48;
  const destLabel = (os.localizacao || "—").toUpperCase();
  const destCol = destinoColor(os.localizacao);
  doc.setFillColor(...destCol);
  doc.roundedRect(14, destY, 182, 12, 2, 2, "F");
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.title);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(`DESTINO: ${destLabel}`, 105, destY + 8, { align: "center" });
  doc.setTextColor(...PDF_COLORS.text);

  // Bloco de assinaturas com Data
  const sigY = destY + 22;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  // Assinatura esq
  doc.line(14, sigY, 95, sigY);
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.small);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Responsável Produção — Assinatura", 54, sigY + 4, { align: "center" });
  doc.line(14, sigY + 12, 60, sigY + 12);
  doc.text("Nome", 37, sigY + 16, { align: "center" });
  doc.line(64, sigY + 12, 95, sigY + 12);
  doc.text("Data", 79, sigY + 16, { align: "center" });

  // Assinatura dir
  doc.line(115, sigY, 196, sigY);
  doc.text("Conferência — Assinatura", 155, sigY + 4, { align: "center" });
  doc.line(115, sigY + 12, 161, sigY + 12);
  doc.text("Nome", 138, sigY + 16, { align: "center" });
  doc.line(165, sigY + 12, 196, sigY + 12);
  doc.text("Data", 180, sigY + 16, { align: "center" });
  doc.setLineWidth(0.2);
  doc.setTextColor(...PDF_COLORS.text);

  finalizePdf(doc, { userName: extras.userName });
  doc.save(`${os.codigo}.pdf`);
}
