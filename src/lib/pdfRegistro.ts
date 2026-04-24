import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { Registro } from "@/hooks/useRegistros";
import {
  REGISTRO_ORIGEM_LABELS,
  REGISTRO_URGENCIA_LABELS,
  REGISTRO_STATUS_LABELS,
} from "@/lib/registroTransitions";
import { setupPdfDoc } from "@/lib/pdfSetup";
import { addPdfHeader } from "@/lib/pdfHeader";
import { finalizePdf } from "@/lib/pdfFooter";
import {
  PDF_COLORS,
  PDF_FONT,
  PDF_SIZES,
  urgenciaColor,
  origemColor,
  registroStatusColor,
} from "@/lib/pdfTheme";
import { supabase } from "@/integrations/supabase/client";

interface RegistroPdfExtras {
  userName?: string | null;
}

function buildPills(registro: Registro) {
  const origemLabel =
    REGISTRO_ORIGEM_LABELS[registro.origem]?.label || registro.origem.toUpperCase();
  const urgenciaLabel = REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia;
  const statusLabel = REGISTRO_STATUS_LABELS[registro.status] || registro.status;
  return [
    { label: origemLabel.toUpperCase(), color: origemColor(registro.origem) },
    { label: urgenciaLabel.toUpperCase(), color: urgenciaColor(registro.urgencia) },
    { label: statusLabel.toUpperCase(), color: registroStatusColor(registro.status) },
  ];
}

function addInfoGrid(doc: jsPDF, items: [string, string][], y: number): number {
  const colWidth = 91;
  const rowH = 10;
  items.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * colWidth;
    const cy = y + row * rowH;
    doc.setFontSize(PDF_SIZES.small);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.setFont(PDF_FONT, "normal");
    doc.text(label, x, cy);
    doc.setFontSize(PDF_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(value || "—", x, cy + 4.5);
  });
  return y + Math.ceil(items.length / 2) * rowH + 2;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPDFRegistroCompleto(
  registro: Registro,
  extras: RegistroPdfExtras = {},
): Promise<{ blobUrl: string; fileName: string }> {
  const doc = new jsPDF();
  setupPdfDoc(doc);

  let y = addPdfHeader(doc, {
    codigo: registro.codigo,
    tipo: "Ocorrência",
    pills: buildPills(registro),
  });

  // Bloco OS / equipe
  y = addInfoGrid(doc, [
    ["Nº OS", registro.numero_os || "—"],
    ["Cliente", registro.cliente || "—"],
    ["Material", registro.material || "—"],
    ["Ambiente", registro.ambiente || "—"],
    ["Supervisor", registro.supervisor || "—"],
    ["Projetista", registro.projetista || "—"],
    ["Aberto por", registro.aberto_por || "—"],
    ["Data", new Date(registro.created_at).toLocaleDateString("pt-BR")],
  ], y);

  // Classificação — campos condicionais por origem
  // NOTA: "Responsável erro" e "Nome do responsável" foram removidos do PDF
  // por decisão de produto — esses campos ficam só no sistema (painel/dashboard).
  const isSolicitacao = registro.origem === "solicitacao";
  const isQuebraAcabamento = isSolicitacao && registro.tipo === "Quebra no acabamento";

  const classifItems: [string, string][] = [];
  if (registro.tipo) {
    classifItems.push([
      "Tipo",
      `${registro.tipo}${registro.tipo_outro ? ` — ${registro.tipo_outro}` : ""}`,
    ]);
  }
  if (isQuebraAcabamento && registro.acabador_responsavel) {
    classifItems.push(["Acabador responsável", registro.acabador_responsavel]);
  }
  classifItems.push(["Urgência", REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia]);

  if (classifItems.length > 0) {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("Classificação", 14, y);
    y += 5;
    y = addInfoGrid(doc, classifItems, y);
  }

  // Peças — coluna "Não consta OS" condicional + colunas opcionais omitidas
  if (registro.pecas.length > 0) {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`Peças (${registro.pecas.length})`, 14, y);
    y += 3;

    const temNaoConsta = registro.pecas.some((p) => p.nao_consta_os);
    const temMedidaAtual = registro.pecas.some((p) => p.medida_atual && p.medida_atual.trim());
    const temMedidaNec = registro.pecas.some((p) => p.medida_necessaria && p.medida_necessaria.trim());

    const head: string[] = ["#", "Descrição", "Qtd"];
    if (temMedidaAtual) head.push("Medida atual");
    if (temMedidaNec) head.push("Medida necessária");
    if (temNaoConsta) head.push("Não consta OS");

    const body = registro.pecas.map((p) => {
      const row: any[] = [p.item || "", p.descricao || "", String(p.quantidade || 1)];
      if (temMedidaAtual) row.push(p.medida_atual || "");
      if (temMedidaNec) row.push(p.medida_necessaria || "");
      if (temNaoConsta) {
        row.push(
          p.nao_consta_os
            ? { content: "NÃO CONSTA OS", styles: { fontStyle: "bold", textColor: PDF_COLORS.vermelho } }
            : "",
        );
      }
      return row;
    });

    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      styles: { fontSize: PDF_SIZES.small, cellPadding: 2, font: PDF_FONT, textColor: PDF_COLORS.text },
      headStyles: { fillColor: PDF_COLORS.cinzaLight, textColor: PDF_COLORS.text, fontStyle: "bold" },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // Justificativa
  if (registro.justificativa) {
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("Justificativa", 14, y);
    y += 4;
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.body);
    const lines = doc.splitTextToSize(registro.justificativa, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.2 + 4;
  }

  // Recolha
  if (registro.requer_recolha) {
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("Recolha", 14, y);
    y += 5;
    y = addInfoGrid(doc, [
      ["Origem", registro.recolha_origem || "—"],
      ["Destino", registro.recolha_destino || "—"],
    ], y);
  }

  // Demanda Projetos (caixa roxa destacada)
  if (registro.encaminhar_projetos && registro.instrucao_projetos) {
    const txt = registro.instrucao_projetos;
    const lines = doc.splitTextToSize(txt, 170);
    const boxH = Math.max(16, lines.length * 4.2 + 12);
    doc.setFillColor(...PDF_COLORS.roxoLight);
    doc.setDrawColor(...PDF_COLORS.roxo);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, y, 182, boxH, 2, 2, "FD");
    doc.setLineWidth(0.2);
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.roxo);
    doc.text("Demanda para Projetos", 18, y + 6);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.body);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(lines, 18, y + 11);
    y += boxH + 4;
  }

  // Evidências em grid 3 colunas
  if (registro.evidencias && registro.evidencias.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`Evidências (${registro.evidencias.length})`, 14, y);
    y += 4;

    const cellW = 58;
    const cellH = 44;
    const gap = 4;
    const dateStr = new Date(registro.created_at).toLocaleDateString("pt-BR");

    for (let i = 0; i < registro.evidencias.length; i++) {
      const col = i % 3;
      if (col === 0 && i > 0) y += cellH + 10;
      if (y + cellH + 10 > 270) {
        doc.addPage();
        y = 20;
      }
      const x = 14 + col * (cellW + gap);
      doc.setDrawColor(...PDF_COLORS.border);
      doc.rect(x, y, cellW, cellH, "S");
      const dataUrl = await loadImageAsDataUrl(registro.evidencias[i].url_foto);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, "JPEG", x + 1, y + 1, cellW - 2, cellH - 2);
        } catch {
          // ignora imagem corrompida
        }
      }
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(PDF_SIZES.small);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(`Evidência ${i + 1} — ${dateStr}`, x, y + cellH + 4);
    }
    y += cellH + 10;
  }

  // Histórico em timeline vertical (lê activity_logs)
  try {
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("created_at, action, user_name, details")
      .eq("entity_type", "registro")
      .eq("entity_id", registro.id)
      .order("created_at", { ascending: true });

    if (logs && logs.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(PDF_SIZES.label);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text("Histórico", 14, y);
      y += 5;

      const lineX = 18;
      logs.forEach((log) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        // bolinha
        doc.setFillColor(...PDF_COLORS.chumbo);
        doc.circle(lineX, y, 1.2, "F");
        // linha vertical
        doc.setDrawColor(...PDF_COLORS.border);
        doc.setLineWidth(0.3);
        doc.line(lineX, y + 1.5, lineX, y + 8);
        doc.setLineWidth(0.2);
        // texto
        const when = new Date(log.created_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        doc.setFont(PDF_FONT, "bold");
        doc.setFontSize(PDF_SIZES.small);
        doc.setTextColor(...PDF_COLORS.text);
        doc.text(`${when} — ${log.action}`, lineX + 4, y + 1);
        doc.setFont(PDF_FONT, "normal");
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text(`por ${log.user_name || "Sistema"}`, lineX + 4, y + 5);
        y += 9;
      });
      y += 2;
      doc.setTextColor(...PDF_COLORS.text);
    }
  } catch {
    // se falhar busca de logs, segue sem timeline
  }

  // QR code no rodapé da última página
  try {
    const qrUrl = `https://pcp.nueprojetos.com.br/registros/${registro.codigo}`;
    const qrData = await QRCode.toDataURL(qrUrl, { margin: 0, width: 200 });
    const totalPages = (doc.internal as any).getNumberOfPages();
    doc.setPage(totalPages);
    const pageH = doc.internal.pageSize.getHeight();
    const qrSize = 22;
    const qrX = 14;
    const qrY = pageH - qrSize - 16;
    doc.addImage(qrData, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.small);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text("Acesse esta ocorrência:", qrX + qrSize + 4, qrY + 6);
    doc.text(qrUrl, qrX + qrSize + 4, qrY + 11);
    doc.setTextColor(...PDF_COLORS.text);
  } catch {
    // se QR falhar, segue
  }

  finalizePdf(doc, { userName: extras.userName });
  const fileName = `${registro.codigo}.pdf`;
  const rawBlob = doc.output("blob");
  const blob = new Blob([rawBlob], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, fileName };
}

export function gerarPDFRegistroProducao(
  registro: Registro,
  extras: RegistroPdfExtras = {},
): { blobUrl: string; fileName: string } {
  const doc = new jsPDF();
  setupPdfDoc(doc);

  // Header padronizado com pills (origem/urgência)
  const pills = [
    {
      label: (REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia).toUpperCase(),
      color: urgenciaColor(registro.urgencia),
    },
  ];
  let y = addPdfHeader(doc, {
    codigo: registro.codigo,
    tipo: "Registro — Produção",
    pills,
  });

  // Instrução em destaque amarelo no topo
  if (registro.instrucao_projetos) {
    const lines = doc.splitTextToSize(registro.instrucao_projetos, 170);
    const boxH = Math.max(18, lines.length * 4.5 + 10);
    doc.setFillColor(...PDF_COLORS.amareloLight);
    doc.setDrawColor(...PDF_COLORS.amarelo);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, y, 182, boxH, 2, 2, "FD");
    doc.setLineWidth(0.2);
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("INSTRUÇÃO", 18, y + 6);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(PDF_SIZES.body);
    doc.text(lines, 18, y + 12);
    y += boxH + 5;
  }

  // Dados essenciais
  y = addInfoGrid(doc, [
    ["OS", registro.numero_os || "—"],
    ["Cliente", registro.cliente || "—"],
    ["Material", registro.material || "—"],
    ["Ambiente", registro.ambiente || "—"],
  ], y);

  // Tabela de peças com medida necessária em destaque
  if (registro.pecas.length > 0) {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("Peças a produzir", 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["#", "Descrição", "Qtd", "Medida necessária"]],
      body: registro.pecas.map((p) => [
        p.item || "",
        p.descricao || "",
        String(p.quantidade || 1),
        p.medida_necessaria || "—",
      ]),
      styles: { fontSize: PDF_SIZES.label, cellPadding: 3.5, font: PDF_FONT, textColor: PDF_COLORS.text },
      headStyles: { fillColor: PDF_COLORS.cinzaLight, textColor: PDF_COLORS.text, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 14 },
        2: { cellWidth: 18, halign: "right" },
        3: { fontStyle: "bold" },
      },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Destino + Urgência bem visíveis
  const pageH = doc.internal.pageSize.getHeight();
  const badgeY = Math.max(y + 4, pageH - 50);

  // Destino (esquerda) — só se houver
  if (registro.recolha_destino) {
    doc.setFillColor(...PDF_COLORS.chumbo);
    doc.roundedRect(14, badgeY, 88, 14, 2, 2, "F");
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(PDF_SIZES.label);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(`DESTINO: ${registro.recolha_destino.toUpperCase()}`, 58, badgeY + 9, { align: "center" });
  }
  // Urgência (direita) — sempre
  const urgCol = urgenciaColor(registro.urgencia);
  doc.setFillColor(...urgCol);
  doc.roundedRect(108, badgeY, 88, 14, 2, 2, "F");
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.label);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(
    `URGÊNCIA: ${(REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia).toUpperCase()}`,
    152,
    badgeY + 9,
    { align: "center" },
  );
  doc.setTextColor(...PDF_COLORS.text);

  // Assinaturas
  const sigY = badgeY + 22;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, 95, sigY);
  doc.line(115, sigY, 196, sigY);
  doc.setLineWidth(0.2);
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.small);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Responsável Corte", 54, sigY + 4, { align: "center" });
  doc.text("Conferência", 155, sigY + 4, { align: "center" });
  doc.setTextColor(...PDF_COLORS.text);

  finalizePdf(doc, { userName: extras.userName });
  const fileName = `${registro.codigo}_producao.pdf`;
  const blobUrl = doc.output("bloburl") as unknown as string;
  return { blobUrl, fileName };
}
