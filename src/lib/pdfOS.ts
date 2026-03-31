import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MockOS } from "@/data/mockProducao";

export function gerarPDFOS(os: MockOS) {
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
  doc.text(os.codigo, 196, 18, { align: "right" });
  doc.setDrawColor(200);
  doc.line(14, 28, 196, 28);

  let y = 36;

  // Info
  const items: [string, string][] = [
    ["Cliente", os.cliente],
    ["Material", os.material],
    ["Ambiente", os.ambiente],
    ["Supervisor", os.supervisor],
    ["Projetista", os.projetista],
    ["Data Entrega", os.data_entrega ? new Date(os.data_entrega).toLocaleDateString("pt-BR") : "—"],
  ];

  const colW = 90;
  items.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * colW;
    const cy = y + row * 12;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text(label, x, cy);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(value || "—", x, cy + 5);
  });
  y += Math.ceil(items.length / 2) * 12 + 6;

  // Peças table
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Peças (${os.pecas.length})`, 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["#", "Descrição", "Qtd", "Comp.", "Larg.", "45°", "Poliborda", "Usinagem"]],
    body: os.pecas.map((p) => [
      p.item,
      p.descricao,
      String(p.quantidade),
      p.comprimento ? `${p.comprimento}m` : "",
      p.largura ? `${p.largura}m` : "",
      p.precisa_45 ? "Sim" : "—",
      p.precisa_poliborda ? "Sim" : "—",
      p.precisa_usinagem ? "Sim" : "—",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
    theme: "grid",
    margin: { left: 14, right: 14 },
  });

  doc.save(`${os.codigo}.pdf`);
}
