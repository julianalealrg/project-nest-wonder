import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Factory, CheckCircle, Clock, Palette } from "lucide-react";

interface Props {
  registrosAbertos: number;
  osEmProducao: number;
  taxaResolucao: number;
  tempoMedio: number;
  pendentesProjetos?: number;
}

export function DashboardKPIs({ registrosAbertos, osEmProducao, taxaResolucao, tempoMedio, pendentesProjetos = 0 }: Props) {
  const cards = [
    { label: "Registros abertos", value: registrosAbertos, icon: AlertTriangle, color: "text-nue-roxo", accent: "border-l-nue-roxo" },
    { label: "OS em produção", value: osEmProducao, icon: Factory, color: "text-nue-laranja", accent: "border-l-nue-laranja" },
    { label: "Pendentes de Projetos", value: pendentesProjetos, icon: Palette, color: "text-nue-roxo", accent: "border-l-nue-roxo" },
    { label: "Taxa de resolução", value: `${taxaResolucao}%`, icon: CheckCircle, color: "text-nue-verde", accent: "border-l-nue-verde" },
    { label: "Tempo médio (dias)", value: tempoMedio, icon: Clock, color: "text-nue-amarelo", accent: "border-l-nue-amarelo" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className={`border-l-4 ${c.accent}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 ${c.color} shrink-0`} />
            <div>
              <p className="font-display text-3xl text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
