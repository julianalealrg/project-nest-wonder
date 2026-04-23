import { Truck, Package, RotateCcw, CalendarCheck, Home, ClipboardCheck, AlertTriangle } from "lucide-react";
import { Romaneio, ROTAS_INTERNAS, ROTAS_CLIENTE, type CategoriaRota } from "@/hooks/useRomaneios";

interface LogisticaKPIProps {
  romaneios: Romaneio[];
  categoria?: CategoriaRota;
}

export function LogisticaKPI({ romaneios, categoria = "todas" }: LogisticaKPIProps) {
  const internas = ROTAS_INTERNAS as readonly string[];
  const cliente = ROTAS_CLIENTE as readonly string[];

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  if (categoria === "interna") {
    const emTransito = romaneios.filter((r) => internas.includes(r.tipo_rota) && r.status === "em_transito").length;
    const aguardandoDespacho = romaneios.filter((r) => internas.includes(r.tipo_rota) && r.status === "pendente").length;
    const conferenciasPendentes = romaneios.filter(
      (r) => internas.includes(r.tipo_rota) && r.status === "em_transito",
    ).length;
    const recolhasPendentes = romaneios.filter(
      (r) => r.tipo_rota === "recolha" && r.status !== "entregue",
    ).length;

    const cards = [
      { label: "Em trânsito interno", value: emTransito, icon: Truck },
      { label: "Aguardando despacho", value: aguardandoDespacho, icon: Package },
      { label: "Conferências pendentes", value: conferenciasPendentes, icon: ClipboardCheck },
      { label: "Recolhas pendentes", value: recolhasPendentes, icon: RotateCcw },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-lg border border-l-4 border-l-nue-azul p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <c.icon className="h-4 w-4 text-nue-azul" />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-nue-azul">{c.value}</p>
          </div>
        ))}
      </div>
    );
  }

  if (categoria === "expedicao") {
    const emTransito = romaneios.filter((r) => cliente.includes(r.tipo_rota) && r.status === "em_transito").length;
    const aguardandoConfirmacao = romaneios.filter(
      (r) => cliente.includes(r.tipo_rota) && r.status === "em_transito" && !r.foto_romaneio_assinado_url,
    ).length;
    const entregasMes = romaneios.filter((r) => {
      if (!cliente.includes(r.tipo_rota) || r.status !== "entregue" || !r.data_recebimento) return false;
      const d = new Date(r.data_recebimento);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
    // "Atrasos" — sem campo de prazo no romaneio; usamos > 7 dias em trânsito como proxy
    const atrasos = romaneios.filter((r) => {
      if (!cliente.includes(r.tipo_rota) || r.status === "entregue") return false;
      const ref = r.data_saida || r.created_at;
      if (!ref) return false;
      const diff = (now.getTime() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 7;
    }).length;

    const cards = [
      { label: "Em trânsito ao cliente", value: emTransito, icon: Truck },
      { label: "Aguardando confirmação", value: aguardandoConfirmacao, icon: ClipboardCheck },
      { label: "Entregas do mês", value: entregasMes, icon: CalendarCheck },
      { label: "Atrasos", value: atrasos, icon: AlertTriangle },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-lg border border-l-4 border-l-nue-verde p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <c.icon className="h-4 w-4 text-nue-verde" />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-nue-verde">{c.value}</p>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: visão geral (mantém comportamento legado)
  const emTransito = romaneios.filter((r) => r.status === "em_transito").length;
  const entregasPendentes = romaneios.filter((r) => r.status === "pendente" && r.tipo_rota !== "recolha").length;
  const recolhasPendentes = romaneios.filter((r) => r.status !== "entregue" && r.tipo_rota === "recolha").length;
  const entregasMes = romaneios.filter((r) => {
    if (r.status !== "entregue" || !r.data_recebimento) return false;
    const d = new Date(r.data_recebimento);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const cards = [
    { label: "Em trânsito", value: emTransito, icon: Truck, accent: "border-l-nue-azul", color: "text-nue-azul" },
    { label: "Entregas pendentes", value: entregasPendentes, icon: Package, accent: "border-l-muted-foreground", color: "text-foreground" },
    { label: "Recolhas pendentes", value: recolhasPendentes, icon: RotateCcw, accent: "border-l-nue-amarelo", color: "text-nue-amarelo" },
    { label: "Entregas do mês", value: entregasMes, icon: CalendarCheck, accent: "border-l-nue-verde", color: "text-nue-verde" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`bg-card rounded-lg border border-l-4 ${c.accent} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <span className="text-xs text-muted-foreground">{c.label}</span>
          </div>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
