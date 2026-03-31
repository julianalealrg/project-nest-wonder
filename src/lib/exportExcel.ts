import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function downloadXlsx(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), filename);
}

export function exportProducaoExcel(osList: any[]) {
  const data = osList.map((os) => ({
    OS: os.codigo,
    Cliente: os.cliente,
    Ambiente: os.ambiente,
    Material: os.material,
    "Peças Aprovadas": os.pecas.filter((p: any) => p.status_cq === "aprovado").length,
    "Peças Total": os.pecas.length,
    Status: os.status,
    Localização: os.localizacao,
    Entrega: os.data_entrega ? new Date(os.data_entrega).toLocaleDateString("pt-BR") : "",
    "Dias Parado": Math.floor((Date.now() - new Date(os.updated_at).getTime()) / 86400000),
  }));
  downloadXlsx(data, "producao.xlsx");
}

export function exportRegistrosExcel(registros: any[]) {
  const data = registros.map((r) => ({
    Código: r.codigo,
    OS: r.numero_os || "",
    Cliente: r.cliente || "",
    Tipo: r.tipo || "",
    Urgência: r.urgencia,
    Status: r.status,
    Data: new Date(r.created_at).toLocaleDateString("pt-BR"),
    Justificativa: r.justificativa || "",
  }));
  downloadXlsx(data, "registros.xlsx");
}

export function exportDashboardExcel(charts: any) {
  const wb = XLSX.utils.book_new();

  if (charts.byTipo?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.byTipo), "Por Tipo");
  }
  if (charts.bySupervisor?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.bySupervisor), "Por Supervisor");
  }
  if (charts.byProjetista?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.byProjetista), "Por Projetista");
  }
  if (charts.byUrgencia?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.byUrgencia), "Por Urgência");
  }
  if (charts.byOsStatus?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.byOsStatus), "OS por Status");
  }
  if (charts.trend?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.trend), "Tendência");
  }
  if (charts.acabadores?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charts.acabadores), "Acabadores");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "dashboard.xlsx");
}
