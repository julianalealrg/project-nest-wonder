import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const URGENCIA_COLORS: Record<string, string> = {
  alta: "#C0392B",
  Alta: "#C0392B",
  media: "#D4A017",
  Média: "#D4A017",
  média: "#D4A017",
  baixa: "#27AE60",
  Baixa: "#27AE60",
  critica: "#8B0000",
  Crítica: "#8B0000",
};

const STATUS_COLORS: Record<string, string> = {
  "Aguardando Chapa": "#95A5A6",
  "Fila de Corte": "#D4A017",
  "Cortando": "#E67E22",
  "Enviado Base 2": "#2980B9",
  "Em Acabamento": "#8E44AD",
  "CQ": "#1ABC9C",
  "Expedição": "#27AE60",
  "Entregue": "#2ECC71",
  "Terceiros": "#7F8C8D",
};

const FALLBACK_COLORS = ["#3D3D38", "#2980B9", "#8E44AD", "#C0392B", "#27AE60", "#D4A017"];

interface Props {
  rankingTipo: { name: string; value: number }[];
  tendenciaSemanal: { semana: string; criados: number; resolvidos: number }[];
  porSupervisor: { name: string; value: number }[];
  porProjetista: { name: string; value: number }[];
  acabadores: { name: string; finalizadas: number; quebras: number }[];
  porUrgencia: { name: string; value: number }[];
  osPorStatus: { name: string; value: number }[];
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">{children}</CardContent>
    </Card>
  );
}

export function DashboardCharts({ rankingTipo, tendenciaSemanal, porSupervisor, porProjetista, acabadores, porUrgencia, osPorStatus }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Ranking por tipo */}
      <ChartCard title="Ranking por tipo de ocorrência">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rankingTipo} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,6%,79%)" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
            <Tooltip />
            <Bar dataKey="value" fill="#3D3D38" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tendência semanal */}
      <ChartCard title="Criados vs Resolvidos por semana">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tendenciaSemanal} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,6%,79%)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="criados" stroke="#C0392B" strokeWidth={2} dot={{ r: 3 }} name="Criados" />
            <Line type="monotone" dataKey="resolvidos" stroke="#27AE60" strokeWidth={2} dot={{ r: 3 }} name="Resolvidos" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Por supervisor */}
      <ChartCard title="Registros por supervisor">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porSupervisor} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,6%,79%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2980B9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Erros por projetista */}
      <ChartCard title="Erros por projetista">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porProjetista} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,6%,79%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#8E44AD" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Acabadores */}
      <ChartCard title="Acabadores: finalizadas vs quebras">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={acabadores} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,6%,79%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="finalizadas" fill="#27AE60" radius={[4, 4, 0, 0]} name="Finalizadas" />
            <Bar dataKey="quebras" fill="#C0392B" radius={[4, 4, 0, 0]} name="Quebras" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Urgência (pizza) */}
      <ChartCard title="Distribuição por urgência">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={porUrgencia} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {porUrgencia.map((entry, i) => (
                <Cell key={i} fill={URGENCIA_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* OS por status (pizza) */}
      <ChartCard title="OS por status de produção">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={osPorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {osPorStatus.map((entry, i) => (
                <Cell key={i} fill={STATUS_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
