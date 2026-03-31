import { Truck, Package, RotateCcw, CalendarCheck } from "lucide-react";
import { Romaneio } from "@/hooks/useRomaneios";

interface LogisticaKPIProps {
  romaneios: Romaneio[];
}

export function LogisticaKPI({ romaneios }: LogisticaKPIProps) {
  const emTransito = romaneios.filter((r) => r.status === "em_transito").length;
  const entregasPendentes = romaneios.filter((r) => r.status === "pendente" && r.tipo_rota !== "recolha").length;
  const recolhasPendentes = romaneios.filter((r) => r.status !== "entregue" && r.tipo_rota === "recolha").length;

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const entregasMes = romaneios.filter((r) => {
    if (r.status !== "entregue" || !r.data_recebimento) return false;
    const d = new Date(r.data_recebimento);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const cards = [
    { label: "Em trânsito", value: emTransito, icon: Truck, color: "text-blue-600" },
    { label: "Entregas pendentes", value: entregasPendentes, icon: Package, color: "text-foreground" },
    { label: "Recolhas pendentes", value: recolhasPendentes, icon: RotateCcw, color: "text-foreground" },
    { label: "Entregas do mês", value: entregasMes, icon: CalendarCheck, color: "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card rounded-lg border p-4">
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
