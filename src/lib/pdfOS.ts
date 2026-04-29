import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MockOS } from "@/data/mockProducao";
import { setupPdfDoc } from "@/lib/pdfSetup";
import { addPdfHeader } from "@/lib/pdfHeader";
import { finalizePdf } from "@/lib/pdfFooter";
import { PDF_COLORS, PDF_FONT, PDF_SIZES, destinoColor, origemColor } from "@/lib/pdfTheme";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Versão async que busca dados do banco (registros, activity_logs) e renderiza
 * o PDF da OS com anexos (ocorrências, galeria de fotos, histórico).
 * O documento principal (ordem de produção) continua na primeira página.
 */
export async function gerarPDFOSCompleto(os: MockOS, extras: OSPdfExtras = {}): Promise<{ blobUrl: string; fileName: string }> {
  const [registrosRes, logsRes] = await Promise.all([
    supabase
      .from("registros")
      .select("id, codigo, origem, tipo, status, urgencia, justificativa, fotos, peca_id, quantidade_afetada, acao_produtiva, created_at")
      .eq("os_id", os.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("action, user_name, details, created_at")
      .eq("entity_type", "ordens_servico")
      .eq("entity_id", os.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const registros: any[] = registrosRes.data || [];
  const logs: any[] = logsRes.data || [];

  // Coleta fotos da OS pra galeria
  const fotosColetadas: { url: string; legenda: string }[] = [];
  for (const p of os.pecas) {
    if ((p as any).foto_insumos_url) fotosColetadas.push({ url: (p as any).foto_insumos_url, legenda: `Peça ${p.item} — Insumos cabine` });
    if ((p as any).foto_acabador_assinado_url) fotosColetadas.push({ url: (p as any).foto_acabador_assinado_url, legenda: `Peça ${p.item} — Doc acabador` });
    if ((p as any).foto_cq_url) fotosColetadas.push({ url: (p as any).foto_cq_url, legenda: `Peça ${p.item} — CQ` });
  }
  for (const r of registros) {
    if (r.fotos && Array.isArray(r.fotos)) {
      for (const url of r.fotos) {
        if (url) fotosColetadas.push({ url, legenda: `${r.codigo} — ${r.tipo || r.origem}` });
      }
    }
  }

  // Mapeia peca_id → registro pra marcar peças com problema na tabela
  const registrosPorPeca = new Map<string, any>();
  for (const r of registros) {
    if (r.peca_id && r.status !== "resolvido") registrosPorPeca.set(r.peca_id, r);
  }

  return gerarPDFOS(os, {
    ...extras,
    _registros: registros,
    _logs: logs,
    _fotos: fotosColetadas,
    _registrosPorPeca: registrosPorPeca,
  } as any);
}

export function gerarPDFOS(os: MockOS, extras: OSPdfExtras = {}): { blobUrl: string; fileName: string } {
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

  // Colunas opcionais: omitir se todas as peças estiverem vazias
  const temMaterial = !!(os.material && os.material.trim());
  const temObs = os.pecas.some((p) => p.precisa_45 || p.precisa_poliborda || p.precisa_usinagem);

  const head: string[] = ["#", "Descrição", "Comp. (m)", "Larg. (m)", "Qtd"];
  if (temMaterial) head.push("Material");
  if (temObs) head.push("Obs");

  const registrosPorPeca: Map<string, any> = (extras as any)._registrosPorPeca || new Map();
  const body = os.pecas.map((p) => {
    const reg = registrosPorPeca.get(p.id);
    let descricaoComMarca = p.descricao;
    if (reg) {
      const marca = reg.tipo?.toLowerCase().includes("falt") ? "✗ FALTANTE"
        : reg.tipo?.toLowerCase().includes("avari") ? "⚠ AVARIADA"
        : "● COM OCORRÊNCIA";
      descricaoComMarca = `${p.descricao}  [${marca} — ${reg.codigo}]`;
    }
    const row: any[] = [
      p.item,
      descricaoComMarca,
      p.comprimento != null ? Number(p.comprimento).toFixed(3) : "",
      p.largura != null ? Number(p.largura).toFixed(3) : "",
      String(p.quantidade),
    ];
    if (temMaterial) row.push(os.material || "");
    if (temObs) {
      row.push(
        [p.precisa_45 && "45°", p.precisa_poliborda && "Polib.", p.precisa_usinagem && "Usin."]
          .filter(Boolean)
          .join(", "),
      );
    }
    return row;
  });

  const colStyles: Record<number, any> = {
    0: { cellWidth: 10 },
    2: { cellWidth: 22, halign: "right" },
    3: { cellWidth: 22, halign: "right" },
    4: { cellWidth: 12, halign: "right" },
  };
  if (temMaterial) colStyles[5] = { cellWidth: 38 };

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: { fontSize: PDF_SIZES.small, cellPadding: 2, font: PDF_FONT, textColor: PDF_COLORS.text },
    headStyles: {
      fillColor: PDF_COLORS.cinzaLight,
      textColor: PDF_COLORS.text,
      fontStyle: "bold",
    },
    columnStyles: colStyles,
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

  // Badge de destino + assinaturas — posicionados próximos ao conteúdo,
  // mas respeitando margem mínima do rodapé (18mm).
  const pageH = doc.internal.pageSize.getHeight();
  const sigBottomMax = pageH - 18;
  // Bloco completo: destino (12mm) + gap (10mm) + assinaturas (12mm) = 34mm
  const desiredDestY = y + 6;
  const maxDestY = sigBottomMax - 12 - 22;
  const destY = Math.min(desiredDestY, maxDestY);
  const sigY = destY + 22;

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
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  // Assinatura esq
  doc.line(14, sigY, 95, sigY);
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.small);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Responsável Produção — Assinatura", 54, sigY + 4, { align: "center" });
  doc.line(14, sigY + 9, 60, sigY + 9);
  doc.text("Nome", 37, sigY + 12, { align: "center" });
  doc.line(64, sigY + 9, 95, sigY + 9);
  doc.text("Data", 79, sigY + 12, { align: "center" });

  // Assinatura dir
  doc.line(115, sigY, 196, sigY);
  doc.text("Conferência — Assinatura", 155, sigY + 4, { align: "center" });
  doc.line(115, sigY + 9, 161, sigY + 9);
  doc.text("Nome", 138, sigY + 12, { align: "center" });
  doc.line(165, sigY + 9, 196, sigY + 9);
  doc.text("Data", 180, sigY + 12, { align: "center" });
  doc.setLineWidth(0.2);
  doc.setTextColor(...PDF_COLORS.text);

  // Páginas anexas (só renderizam se houver dados extras)
  const registros: any[] = (extras as any)._registros || [];
  const fotos: { url: string; legenda: string }[] = (extras as any)._fotos || [];
  const logs: any[] = (extras as any)._logs || [];

  if (registros.length > 0) {
    addAnexoOcorrencias(doc, os.codigo, registros);
  }
  if (logs.length > 0) {
    addAnexoHistorico(doc, os.codigo, logs);
  }

  finalizePdf(doc, { userName: extras.userName });
  const fileName = `${os.codigo}.pdf`;
  const rawBlob = doc.output("blob");
  const blob = new Blob([rawBlob], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, fileName };
}

// ============================================================
// Anexos do PDF (paginas extras)
// ============================================================

function addAnexoHeader(doc: jsPDF, osCodigo: string, titulo: string): number {
  doc.addPage();
  let y = 18;
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(PDF_SIZES.heading);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`${osCodigo} — ${titulo}`, 14, y);
  y += 4;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  y += 6;
  return y;
}

function addAnexoOcorrencias(doc: jsPDF, osCodigo: string, registros: any[]) {
  let y = addAnexoHeader(doc, osCodigo, "Ocorrências e Solicitações");
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(PDF_SIZES.body);

  for (const r of registros) {
    if (y > 260) { doc.addPage(); y = 18; }

    const cor = origemColor(r.origem);
    const origemLabel =
      r.origem === "obra" ? "OCORRÊNCIA OBRA" :
      r.origem === "fabrica" ? "OCORRÊNCIA FÁBRICA" :
      r.origem === "solicitacao" ? "SOLICITAÇÃO REPOSIÇÃO" :
      String(r.origem).toUpperCase();

    // Pill de origem
    doc.setFillColor(...cor);
    doc.roundedRect(14, y, 50, 5.5, 1, 1, "F");
    doc.setFontSize(PDF_SIZES.small);
    doc.setFont(PDF_FONT, "bold");
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(origemLabel, 39, y + 3.7, { align: "center" });

    // Código
    doc.setTextColor(...PDF_COLORS.text);
    doc.setFontSize(PDF_SIZES.label);
    doc.text(r.codigo, 68, y + 4);

    // Status
    doc.setFontSize(PDF_SIZES.small);
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...PDF_COLORS.muted);
    const dt = new Date(r.created_at).toLocaleDateString("pt-BR");
    doc.text(`Status: ${r.status} · ${dt}`, 196, y + 4, { align: "right" });

    y += 8;

    // Tipo + qty afetada
    if (r.tipo) {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(PDF_SIZES.body);
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(r.tipo, 14, y);
      if (r.quantidade_afetada) {
        doc.setFont(PDF_FONT, "normal");
        doc.text(` · qtd afetada: ${r.quantidade_afetada}`, 14 + doc.getTextWidth(r.tipo), y);
      }
      y += 5;
    }

    // Justificativa
    if (r.justificativa) {
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(PDF_SIZES.body);
      doc.setTextColor(...PDF_COLORS.text);
      const lines = doc.splitTextToSize(r.justificativa, 178);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 1;
    }

    // Anexos (fotos)
    const numFotos = Array.isArray(r.fotos) ? r.fotos.length : 0;
    if (numFotos > 0) {
      doc.setFont(PDF_FONT, "italic");
      doc.setFontSize(PDF_SIZES.small);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(`📷 ${numFotos} foto(s) anexada(s) — ver no sistema`, 14, y);
      y += 4;
    }

    // Encaminhamento
    if (r.acao_produtiva) {
      doc.setFont(PDF_FONT, "italic");
      doc.setFontSize(PDF_SIZES.small);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(`→ Encaminhada com ação produtiva: ${r.acao_produtiva}`, 14, y);
      y += 4;
    } else {
      doc.setFont(PDF_FONT, "italic");
      doc.setFontSize(PDF_SIZES.small);
      doc.setTextColor(...PDF_COLORS.vermelho[0], PDF_COLORS.vermelho[1], PDF_COLORS.vermelho[2]);
      doc.text("→ Pendente — sem encaminhamento", 14, y);
      y += 4;
    }

    // Separador entre ocorrências
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(14, y + 1, 196, y + 1);
    y += 5;
  }
}

const ACTION_LABELS_PDF: Record<string, string> = {
  avanco_automatico_pos_recebimento: "Avanço automático",
  avanco_peca: "Peça avançada",
  cq_reprovado: "CQ reprovado",
  criacao_registro: "Registro criado",
  registro_auto_recebimento: "Ocorrência automática",
  criacao_romaneio: "Romaneio criado",
  despacho_romaneio: "Romaneio despachado",
  romaneio_cancelado: "Romaneio cancelado",
  recebimento_romaneio: "Romaneio recebido",
  mudanca_status: "Status alterado",
  os_gerada_de_registro: "OS gerada do registro",
};

function formatLogDetails(action: string, details: any): string {
  if (!details) return "";
  if (action === "mudanca_status" && details.from_status && details.to_status) {
    return `${details.from_status} → ${details.to_status}`;
  }
  if (action === "avanco_peca" && (details.estacao || details.station)) {
    const est = details.estacao || details.station;
    const peca = details.peca_item ? ` · Peça ${details.peca_item}` : "";
    return `${est}${peca}`;
  }
  if (action === "avanco_automatico_pos_recebimento" && details.to_status) {
    return `→ ${details.to_status}`;
  }
  if (action === "recebimento_romaneio" && details.pecas_com_problema) {
    return `${details.pecas_com_problema} ocorrência(s)`;
  }
  return "";
}

function addAnexoHistorico(doc: jsPDF, osCodigo: string, logs: any[]) {
  let y = addAnexoHeader(doc, osCodigo, "Histórico de Atividades");

  const rows = logs.map((log) => {
    const dt = new Date(log.created_at);
    const data = dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const acao = ACTION_LABELS_PDF[log.action] || log.action;
    const detalhe = formatLogDetails(log.action, log.details);
    const por = log.user_name || "Sistema";
    return [data, acao, detalhe, por];
  });

  autoTable(doc, {
    startY: y,
    head: [["Data", "Ação", "Detalhe", "Por"]],
    body: rows,
    styles: { fontSize: PDF_SIZES.small, cellPadding: 1.5, font: PDF_FONT, textColor: PDF_COLORS.text },
    headStyles: { fillColor: PDF_COLORS.cinzaLight, textColor: PDF_COLORS.text, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 50 },
      2: { cellWidth: 60 },
      3: { cellWidth: 40 },
    },
    theme: "grid",
    margin: { left: 14, right: 14 },
  });
}
