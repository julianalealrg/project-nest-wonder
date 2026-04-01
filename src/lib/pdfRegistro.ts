import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Registro } from "@/hooks/useRegistros";
import {
  REGISTRO_ORIGEM_LABELS,
  REGISTRO_URGENCIA_LABELS,
  REGISTRO_STATUS_LABELS,
} from "@/lib/registroTransitions";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfSetup";

function addBadges(doc: jsPDF, registro: Registro, y: number): number {
  const origemLabel = REGISTRO_ORIGEM_LABELS[registro.origem]?.label || registro.origem.toUpperCase();
  const urgenciaLabel = REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia;
  const statusLabel = REGISTRO_STATUS_LABELS[registro.status] || registro.status;

  doc.setFontSize(9);
  doc.setFont("Montserrat", "bold");
  doc.text(`Origem: ${origemLabel}   |   Urgência: ${urgenciaLabel}   |   Status: ${statusLabel}`, 14, y);
  return y + 8;
}

function addInfoGrid(doc: jsPDF, items: [string, string][], y: number): number {
  const colWidth = 90;
  let row = 0;
  items.forEach(([label, value], i) => {
    const col = i % 2;
    if (col === 0 && i > 0) row++;
    const x = 14 + col * colWidth;
    const cy = y + row * 12;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("Montserrat", "normal");
    doc.text(label, x, cy);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(value || "—", x, cy + 5);
  });
  return y + (row + 1) * 12 + 4;
}

function addSignatures(doc: jsPDF, labels: string[], y: number) {
  const pageH = doc.internal.pageSize.getHeight();
  const sigY = Math.max(y + 20, pageH - 40);
  const w = (196 - 14) / labels.length;
  labels.forEach((label, i) => {
    const x = 14 + i * w + w / 2;
    doc.setDrawColor(180);
    doc.line(x - 30, sigY, x + 30, sigY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("Montserrat", "normal");
    doc.text(label, x, sigY + 5, { align: "center" });
  });
}

export function gerarPDFRegistroCompleto(registro: Registro) {
  const doc = new jsPDF();
  setupPdfDoc(doc);
  addPdfHeader(doc, registro.codigo);

  let y = 40;
  y = addBadges(doc, registro, y);

  // OS data
  y = addInfoGrid(doc, [
    ["Nº OS", registro.numero_os || "—"],
    ["Cliente", registro.cliente || "—"],
    ["Material", registro.material || "—"],
    ["Ambiente", registro.ambiente || "—"],
  ], y);

  // Team
  y = addInfoGrid(doc, [
    ["Supervisor", registro.supervisor || "—"],
    ["Projetista", registro.projetista || "—"],
    ["Aberto por", registro.aberto_por || "—"],
    ["Data", new Date(registro.created_at).toLocaleDateString("pt-BR")],
  ], y);

  // Classification
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("Montserrat", "bold");
  doc.text("Classificação", 14, y);
  y += 6;
  y = addInfoGrid(doc, [
    ["Tipo", `${registro.tipo || "—"}${registro.tipo_outro ? ` — ${registro.tipo_outro}` : ""}`],
    ["Responsável erro", `${registro.responsavel_erro_papel || "—"} ${registro.responsavel_erro_nome ? `— ${registro.responsavel_erro_nome}` : ""}`],
    ["Acabador responsável", registro.acabador_responsavel || "—"],
    ["Urgência", REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia],
  ], y);

  // Peças table
  if (registro.pecas.length > 0) {
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("Montserrat", "bold");
    doc.text(`Peças (${registro.pecas.length})`, 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["#", "Descrição", "Qtd", "Medida Atual", "Medida Necessária", "Não consta OS"]],
      body: registro.pecas.map((p) => [
        p.item || "",
        p.descricao || "",
        String(p.quantidade || 1),
        p.medida_atual || "",
        p.medida_necessaria || "",
        p.nao_consta_os ? "SIM" : "",
      ]),
      styles: { fontSize: 8, cellPadding: 2, font: "Montserrat" },
      headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Justificativa
  if (registro.justificativa) {
    doc.setFontSize(10);
    doc.setFont("Montserrat", "bold");
    doc.text("Justificativa", 14, y);
    y += 5;
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(registro.justificativa, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 4;
  }

  // Recolha
  if (registro.requer_recolha) {
    doc.setFontSize(10);
    doc.setFont("Montserrat", "bold");
    doc.text("Recolha", 14, y);
    y += 6;
    y = addInfoGrid(doc, [
      ["Origem", registro.recolha_origem || "—"],
      ["Destino", registro.recolha_destino || "—"],
    ], y);
  }

  // Projetos
  if (registro.encaminhar_projetos && registro.instrucao_projetos) {
    doc.setFontSize(10);
    doc.setFont("Montserrat", "bold");
    doc.text("Encaminhamento para Projetos", 14, y);
    y += 5;
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(registro.instrucao_projetos, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 4;
  }

  // Signatures
  addSignatures(doc, ["Solicitante", "Autorização", "Supervisor"], y);

  doc.save(`${registro.codigo}.pdf`);
}

export function gerarPDFRegistroProducao(registro: Registro) {
  const doc = new jsPDF();
  setupPdfDoc(doc);

  // Urgency banner
  const urgColors: Record<string, [number, number, number]> = {
    critica: [220, 38, 38],
    alta: [220, 38, 38],
    media: [202, 138, 4],
    baixa: [22, 163, 74],
  };
  const bannerColor = urgColors[registro.urgencia] || urgColors.media;
  doc.setFillColor(...bannerColor);
  doc.rect(0, 0, 210, 25, "F");
  doc.setFontSize(16);
  doc.setFont("Montserrat", "bold");
  doc.setTextColor(255);
  doc.text(`URGÊNCIA: ${(REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia).toUpperCase()}`, 105, 16, { align: "center" });
  doc.setTextColor(0);

  let y = 35;
  doc.setFontSize(14);
  doc.setFont("Montserrat", "bold");
  doc.text(registro.codigo, 14, y);
  y += 10;

  // Essential data only
  y = addInfoGrid(doc, [
    ["OS", registro.numero_os || "—"],
    ["Cliente", registro.cliente || "—"],
    ["Material", registro.material || "—"],
    ["Ambiente", registro.ambiente || "—"],
  ], y);

  // Peças in large font
  if (registro.pecas.length > 0) {
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["#", "Descrição", "Qtd", "Medida Necessária"]],
      body: registro.pecas.map((p) => [
        p.item || "",
        p.descricao || "",
        String(p.quantidade || 1),
        p.medida_necessaria || "",
      ]),
      styles: { fontSize: 11, cellPadding: 4, font: "Montserrat" },
      headStyles: { fillColor: [240, 237, 232], textColor: [13, 13, 13], fontStyle: "bold" },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Production instruction highlight
  if (registro.instrucao_projetos) {
    doc.setFillColor(255, 251, 235);
    doc.rect(14, y, 182, 20, "F");
    doc.setDrawColor(202, 138, 4);
    doc.rect(14, y, 182, 20, "S");
    doc.setFontSize(9);
    doc.setFont("Montserrat", "bold");
    doc.text("INSTRUÇÃO:", 18, y + 6);
    doc.setFont("Montserrat", "normal");
    const lines = doc.splitTextToSize(registro.instrucao_projetos, 170);
    doc.text(lines, 18, y + 12);
    y += 26;
  }

  // Destination
  if (registro.recolha_destino) {
    doc.setFontSize(10);
    doc.setFont("Montserrat", "bold");
    doc.text(`Destino: ${registro.recolha_destino}`, 14, y);
    y += 10;
  }

  addSignatures(doc, ["Responsável Corte", "Conferência"], y);

  doc.save(`${registro.codigo}_producao.pdf`);
}
