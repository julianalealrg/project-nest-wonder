import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

function useReportData(startDate: Date) {
  return useQuery({
    queryKey: ["admin-report", startDate.toISOString()],
    queryFn: async () => {
      const from = startDate.toISOString();
      const [logsRes, registrosRes, osRes, romaneiosRes] = await Promise.all([
        supabase.from("activity_logs").select("*").gte("created_at", from),
        supabase.from("registros").select("*").gte("created_at", from),
        supabase.from("ordens_servico").select("*").gte("updated_at", from),
        supabase.from("romaneios").select("*").gte("created_at", from),
      ]);
      const logs = logsRes.data || [];
      const registros = registrosRes.data || [];
      const os = osRes.data || [];
      const romaneios = romaneiosRes.data || [];

      const osMovimentadas = os.length;
      const registrosCriados = registros.length;
      const entregas = romaneios.filter((r) => r.status === "entregue").length;
      const quebras = registros.filter((r) =>
        r.tipo?.toLowerCase().includes("quebra") || r.tipo?.toLowerCase().includes("avaria")
      ).length;

      return { osMovimentadas, registrosCriados, entregas, quebras, totalLogs: logs.length };
    },
  });
}

function ReportCard({ title, period, startDate }: { title: string; period: string; startDate: Date }) {
  const { data, isLoading } = useReportData(startDate);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Button variant="outline" size="sm" disabled>
          <FileText className="h-3.5 w-3.5 mr-1" />Exportar PDF
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-2xl font-bold">{data?.osMovimentadas || 0}</p>
              <p className="text-muted-foreground text-xs">OS movimentadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.registrosCriados || 0}</p>
              <p className="text-muted-foreground text-xs">Registros criados</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.entregas || 0}</p>
              <p className="text-muted-foreground text-xs">Entregas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.quebras || 0}</p>
              <p className="text-muted-foreground text-xs">Quebras</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminRelatorios() {
  const now = new Date();
  return (
    <div className="space-y-4">
      <ReportCard title="Relatório Diário" period="dia" startDate={startOfDay(now)} />
      <ReportCard title="Relatório Semanal" period="semana" startDate={startOfWeek(now, { weekStartsOn: 1 })} />
      <ReportCard title="Relatório Mensal" period="mês" startDate={startOfMonth(now)} />
    </div>
  );
}
