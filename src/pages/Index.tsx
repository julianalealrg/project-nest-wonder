import { Factory, Truck, FileText, BarChart3, Settings, Wrench, AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, startOfMonth } from "date-fns";

function useHomeKPIs() {
  return useQuery({
    queryKey: ["home-kpis"],
    queryFn: async () => {
      const [osRes, regRes] = await Promise.all([
        supabase.from("ordens_servico").select("id, status, updated_at"),
        supabase.from("registros").select("id, status"),
      ]);

      const ordens = osRes.data || [];
      const registros = regRes.data || [];
      const now = new Date();
      const mesInicio = startOfMonth(now);

      const osEmProducao = ordens.filter((o) => o.status !== "entregue").length;
      const registrosAbertos = registros.filter((r) => r.status === "aberto").length;
      const alertasInatividade = ordens.filter(
        (o) => o.status !== "entregue" && differenceInDays(now, new Date(o.updated_at)) >= 3
      ).length;
      const osEntreguesMes = ordens.filter(
        (o) => o.status === "entregue" && new Date(o.updated_at) >= mesInicio
      ).length;

      return { osEmProducao, registrosAbertos, alertasInatividade, osEntreguesMes };
    },
  });
}

const modules = [
  { title: "Produção", description: "OS, peças e estações", url: "/producao", icon: Factory, color: "#2980B9" },
  { title: "Logística", description: "Romaneios e expedições", url: "/logistica", icon: Truck, color: "#27AE60" },
  { title: "Registros", description: "Ocorrências e reposições", url: "/registros", icon: FileText, color: "#C0392B" },
  { title: "Dashboard", description: "Indicadores e analytics", url: "/dashboard", icon: BarChart3, color: "#8E44AD" },
  { title: "Admin", description: "Relatórios e configurações", url: "/admin", icon: Settings, adminOnly: true, color: "#3D3D38" },
  { title: "Configurações", description: "Listas e parâmetros", url: "/admin/configuracoes", icon: Wrench, adminOnly: true, color: "#D4A017" },
];

export default function Index() {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === "admin";
  const visibleModules = modules.filter((m) => !m.adminOnly || isAdmin);
  const { data: kpiData, isLoading } = useHomeKPIs();

  const kpis = [
    { label: "OS em Produção", value: isLoading ? "…" : kpiData?.osEmProducao ?? 0, icon: Factory, color: "#2980B9" },
    { label: "Registros Abertos", value: isLoading ? "…" : kpiData?.registrosAbertos ?? 0, icon: ClipboardList, color: "#C0392B" },
    { label: "Alertas Inatividade", value: isLoading ? "…" : kpiData?.alertasInatividade ?? 0, icon: AlertTriangle, color: "#D4A017" },
    { label: "OS Entregues (mês)", value: isLoading ? "…" : kpiData?.osEntreguesMes ?? 0, icon: CheckCircle2, color: "#27AE60" },
  ];

  return (
    <AppLayout title="Início">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-lg border p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-2xl font-semibold text-foreground mt-2">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Módulos */}
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Módulos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleModules.map((mod) => (
          <Link
            key={mod.url}
            to={mod.url}
            className="bg-card rounded-lg border p-5 hover:shadow-md transition-shadow group animate-fade-in"
          >
            <div className="flex items-center gap-3 mb-2">
              <mod.icon className="h-5 w-5" style={{ color: mod.color }} />
              <span className="font-medium text-foreground">{mod.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
