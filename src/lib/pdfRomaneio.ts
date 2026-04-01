import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Romaneio } from "@/hooks/useRomaneios";
import { ROTA_LABELS } from "@/hooks/useRomaneios";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfSetup";

const ROTA_COLORS: Record<string, [number, number, number]> = {
  base1_base2: [59, 130, 246],
  base2_cliente: [16, 185, 129],
  base1_cliente: [139, 92, 246],
  base2_base1: [245, 158, 11],
  recolha: [239, 68, 68],
};

export function gerarPDFRomaneio(romaneio: Romaneio) {
  const doc = new jsPDF();
  setupPdfDoc(doc);
  addPdfHeader(doc, romaneio.codigo);

  // Route banner
  const bannerColor = ROTA_COLORS[romaneio.tipo_rota] || [100, 100, 100];
  doc.setFillColor(...bannerColor);
  doc.rect(14, 34, 182, 12, "F");
  doc.setFontSize(12);
  doc.setFont("Montserrat", "bold");
  doc.setTextColor(255);
  doc.text(ROTA_LABELS[romaneio.tipo_rota] || romaneio.tipo_rota, 105, 42, { align: "center" });
  doc.setTextColor(0);

  let y = 54;
  doc.setFontSize(10);
  doc.setFont("Montserrat", "normal");
  doc.text(`Data: ${new Date(romaneio.created_at).toLocaleDateString("pt-BR")}`, 14, y);
  y += 8;

  // Info
  const info: [string, string][] = [
    ["Endereço destino", romaneio.endereco_destino || "—"],
    ["Motorista", romaneio.motorista || "—"],
    ["Ajudante", romaneio.ajudante || "—"],
  ];
  info.forEach(([label, value]) => {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(label, 14, y);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(value, 55, y);
    y += 7;
  });
  y += 4;

  // Peças table
  const isToCliente = romaneio.tipo_rota === "base2_cliente" || romaneio.tipo_rota === "base1_cliente";
  const isB2Cliente = romaneio.tipo_rota === "base2_cliente";

  if (isB2Cliente) {
    const byOs = new Map<string, typeof romaneio.pecas>();
    romaneio.pecas.forEach((p) => {
      const key = p.os_codigo || "—";
      const list = byOs.get(key) || [];
      list.push(p);
      byOs.set(key, list);
    });

    byOs.forEach((pecas, osCodigo) => {
      doc.setFontSize(10);
      doc.setFont("Montserrat", "bold");
      doc.text(`OS: ${osCodigo} — ${pecas[0]?.cliente_nome || ""}`, 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["#", "Descrição", "Conferência"]],
        body: pecas.map((p) => [p.peca_item, p.peca_descricao, ""]),
        styles: { fontSize: 9, cellPadding: 3, font: "Montserrat" },
        headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
        columnStyles: { 2: { cellWidth: 30 } },
        theme: "grid",
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    });
  } else {
    autoTable(doc, {
      startY: y,
      head: [["#", "Descrição", "OS", "Conferência"]],
      body: romaneio.pecas.map((p) => [p.peca_item, p.peca_descricao, p.os_codigo, ""]),
      styles: { fontSize: 9, cellPadding: 3, font: "Montserrat" },
      headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
      columnStyles: { 3: { cellWidth: 30 } },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // B2→B1 and recolha: motivo do retorno
  if (romaneio.tipo_rota === "base2_base1" || romaneio.tipo_rota === "recolha") {
    doc.setFontSize(10);
    doc.setFont("Montserrat", "bold");
    doc.text("Motivo do retorno:", 14, y);
    y += 4;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 12;
    doc.line(14, y, 196, y);
    y += 12;
    doc.line(14, y, 196, y);
    y += 10;
  }

  // Signatures
  const pageH = doc.internal.pageSize.getHeight();
  const sigY = Math.max(y + 15, pageH - 70);

  doc.setDrawColor(180);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("Montserrat", "normal");

  // Entregou
  doc.line(14, sigY, 95, sigY);
  doc.text("Assinatura — Entregou", 54, sigY + 5, { align: "center" });
  doc.line(14, sigY + 14, 95, sigY + 14);
  doc.text("Nome", 54, sigY + 19, { align: "center" });
  doc.line(14, sigY + 28, 95, sigY + 28);
  doc.text("Documento", 54, sigY + 33, { align: "center" });

  // Recebeu
  doc.line(115, sigY, 196, sigY);
  doc.text("Assinatura — Recebeu", 155, sigY + 5, { align: "center" });
  doc.line(115, sigY + 14, 196, sigY + 14);
  doc.text("Nome", 155, sigY + 19, { align: "center" });
  doc.line(115, sigY + 28, 196, sigY + 28);
  doc.text("Documento", 155, sigY + 33, { align: "center" });

  // Cláusula de perfeito estado (apenas rotas para cliente)
  if (isToCliente) {
    const clauseY = sigY + 42;
    doc.setDrawColor(200);
    doc.line(14, clauseY, 196, clauseY);
    doc.setFontSize(8);
    doc.setFont("Montserrat", "italic");
    const clause = "Declaro que recebi os materiais acima em perfeito estado de conservação, sem avarias, lascas, trincas ou danos aparentes. Conferi os itens e estão de acordo com o contratado.";
    const lines = doc.splitTextToSize(clause, 180);
    doc.text(lines, 14, clauseY + 5);
  }

  doc.save(`${romaneio.codigo}.pdf`);
}
