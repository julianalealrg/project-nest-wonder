import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Romaneio } from "@/hooks/useRomaneios";
import { ROTA_LABELS } from "@/hooks/useRomaneios";

const ROTA_COLORS: Record<string, [number, number, number]> = {
  base1_base2: [59, 130, 246],
  base2_cliente: [16, 185, 129],
  base1_cliente: [139, 92, 246],
  base2_base1: [245, 158, 11],
  recolha: [239, 68, 68],
};

export function gerarPDFRomaneio(romaneio: Romaneio) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("NUE PROJETOS", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Marmoraria Premium — Recife/PE", 14, 24);
  doc.setTextColor(0);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(romaneio.codigo, 196, 18, { align: "right" });

  // Route banner
  const bannerColor = ROTA_COLORS[romaneio.tipo_rota] || [100, 100, 100];
  doc.setFillColor(...bannerColor);
  doc.rect(14, 30, 182, 12, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text(ROTA_LABELS[romaneio.tipo_rota] || romaneio.tipo_rota, 105, 38, { align: "center" });
  doc.setTextColor(0);

  let y = 50;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
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
  const isB2Cliente = romaneio.tipo_rota === "base2_cliente";

  if (isB2Cliente) {
    // Group by OS
    const byOs = new Map<string, typeof romaneio.pecas>();
    romaneio.pecas.forEach((p) => {
      const key = p.os_codigo || "—";
      const list = byOs.get(key) || [];
      list.push(p);
      byOs.set(key, list);
    });

    byOs.forEach((pecas, osCodigo) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`OS: ${osCodigo} — ${pecas[0]?.cliente_nome || ""}`, 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["#", "Descrição", "Conferência"]],
        body: pecas.map((p) => [p.peca_item, p.peca_descricao, ""]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
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
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // B2→Cliente clause
  if (isB2Cliente) {
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const clause = "Declaro que recebi os materiais acima em perfeito estado de conservação, sem avarias, lascas, trincas ou danos aparentes.";
    const lines = doc.splitTextToSize(clause, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 8;
  }

  // B2→B1 and recolha: motivo do retorno
  if (romaneio.tipo_rota === "base2_base1" || romaneio.tipo_rota === "recolha") {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
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
  const sigY = Math.max(y + 15, pageH - 50);

  // Entregou
  doc.setDrawColor(180);
  doc.line(14, sigY, 95, sigY);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Assinatura — Entregou", 54, sigY + 5, { align: "center" });

  // Recebeu
  doc.line(115, sigY, 196, sigY);
  doc.text("Assinatura — Recebeu", 155, sigY + 5, { align: "center" });

  // Nome + Documento
  const sigY2 = sigY + 16;
  doc.line(14, sigY2, 95, sigY2);
  doc.text("Nome", 54, sigY2 + 5, { align: "center" });
  doc.line(115, sigY2, 196, sigY2);
  doc.text("Documento", 155, sigY2 + 5, { align: "center" });

  doc.save(`${romaneio.codigo}.pdf`);
}
