import { Factory, Truck, FileText, BarChart3, Settings, Wrench, AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, startOfMonth } from "date-fns";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

function useHomeKPIs() {
  return useQuery({
    queryKey: ["home-kpis"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
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
      // Registros abertos = qualquer status diferente de "resolvido"
      const registrosAbertos = registros.filter((r) => r.status !== "resolvido").length;
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
  { title: "Produção", description: "OS, peças e estações", url: "/producao", icon: Factory, color: "text-nue-laranja", bg: "bg-nue-laranja/10" },
  { title: "Logística", description: "Romaneios e expedições", url: "/logistica", icon: Truck, color: "text-nue-azul", bg: "bg-nue-azul/10" },
  { title: "Registros", description: "Ocorrências e reposições", url: "/registros", icon: FileText, color: "text-nue-roxo", bg: "bg-nue-roxo/10" },
  { title: "Dashboard", description: "Indicadores e analytics", url: "/dashboard", icon: BarChart3, color: "text-foreground", bg: "bg-muted" },
  { title: "Admin", description: "Relatórios e configurações", url: "/admin", icon: Settings, adminOnly: true, color: "text-nue-chumbo", bg: "bg-nue-chumbo/10" },
  { title: "Configurações", description: "Listas e parâmetros", url: "/admin/configuracoes", icon: Wrench, adminOnly: true, color: "text-nue-amarelo", bg: "bg-nue-amarelo/10" },
];

export default function Index() {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === "admin";
  const visibleModules = modules.filter((m) => !m.adminOnly || isAdmin);
  const { data: kpiData, isLoading } = useHomeKPIs();

  // Realtime: refresh KPIs when underlying tables change
  useRealtimeInvalidate([
    { table: "registros", queryKeys: [["home-kpis"]] },
    { table: "ordens_servico", queryKeys: [["home-kpis"]] },
    { table: "romaneios", queryKeys: [["home-kpis"]] },
  ]);

  const kpis = [
    { label: "OS em Produção", value: isLoading ? "…" : kpiData?.osEmProducao ?? 0, icon: Factory, accent: "border-l-nue-laranja", color: "text-nue-laranja" },
    { label: "Registros Abertos", value: isLoading ? "…" : kpiData?.registrosAbertos ?? 0, icon: ClipboardList, accent: "border-l-nue-roxo", color: "text-nue-roxo" },
    { label: "Alertas Inatividade", value: isLoading ? "…" : kpiData?.alertasInatividade ?? 0, icon: AlertTriangle, accent: "border-l-nue-amarelo", color: "text-nue-amarelo" },
    { label: "OS Entregues (mês)", value: isLoading ? "…" : kpiData?.osEntreguesMes ?? 0, icon: CheckCircle2, accent: "border-l-nue-verde", color: "text-nue-verde" },
  ];

  return (
    <AppLayout title="Início">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`bg-card rounded-lg border border-l-4 ${kpi.accent} p-4 animate-fade-in`}>
            <div className="flex items-center gap-3">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
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
              <div className={`flex items-center justify-center h-9 w-9 rounded-md ${mod.bg}`}>
                <mod.icon className={`h-5 w-5 ${mod.color}`} />
              </div>
              <span className="font-medium text-foreground">{mod.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
