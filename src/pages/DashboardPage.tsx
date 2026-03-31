import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [origem, setOrigem] = useState("todos");
  const [periodo, setPeriodo] = useState("30d");
  const [supervisor, setSupervisor] = useState("todos");
  const [projetista, setProjetista] = useState("todos");
  const [urgencia, setUrgencia] = useState("todos");

  const filters = { origem, periodo, supervisor, projetista, urgencia };
  const { isLoading, kpis, charts } = useDashboardData(filters);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <DashboardFilters
          origem={origem} onOrigemChange={setOrigem}
          periodo={periodo} onPeriodoChange={setPeriodo}
          supervisor={supervisor} onSupervisorChange={setSupervisor}
          projetista={projetista} onProjetistaChange={setProjetista}
          urgencia={urgencia} onUrgenciaChange={setUrgencia}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DashboardKPIs {...kpis} />
            <DashboardCharts {...charts} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
