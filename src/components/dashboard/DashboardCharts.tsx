import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#0D0D0D", "#3D3D38", "#8B8680", "#CCC8C2", "#A59D94", "#6B6560"];

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
            <Line type="monotone" dataKey="criados" stroke="#0D0D0D" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="resolvidos" stroke="#8B8680" strokeWidth={2} dot={{ r: 3 }} />
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
            <Bar dataKey="value" fill="#3D3D38" radius={[4, 4, 0, 0]} />
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
            <Bar dataKey="value" fill="#0D0D0D" radius={[4, 4, 0, 0]} />
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
            <Bar dataKey="finalizadas" fill="#3D3D38" radius={[4, 4, 0, 0]} />
            <Bar dataKey="quebras" fill="#CCC8C2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Urgência (pizza) */}
      <ChartCard title="Distribuição por urgência">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={porUrgencia} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {porUrgencia.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
              {osPorStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
