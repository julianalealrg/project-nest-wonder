import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Factory, CheckCircle, Clock } from "lucide-react";

interface Props {
  registrosAbertos: number;
  osEmProducao: number;
  taxaResolucao: number;
  tempoMedio: number;
}

export function DashboardKPIs({ registrosAbertos, osEmProducao, taxaResolucao, tempoMedio }: Props) {
  const cards = [
    { label: "Registros abertos", value: registrosAbertos, icon: AlertTriangle, color: "text-destructive" },
    { label: "OS em produção", value: osEmProducao, icon: Factory, color: "text-foreground" },
    { label: "Taxa de resolução", value: `${taxaResolucao}%`, icon: CheckCircle, color: "text-foreground" },
    { label: "Tempo médio (dias)", value: tempoMedio, icon: Clock, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 ${c.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
