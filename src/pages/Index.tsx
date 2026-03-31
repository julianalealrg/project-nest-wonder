import { Factory, Truck, FileText, BarChart3, Settings, Wrench, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

const kpis = [
  { label: "OS em Produção", value: "—", icon: Factory, color: "text-foreground" },
  { label: "Registros Abertos", value: "—", icon: ClipboardList, color: "text-foreground" },
  { label: "Alertas Inatividade", value: "—", icon: AlertTriangle, color: "text-destructive" },
  { label: "OS Entregues (mês)", value: "—", icon: CheckCircle2, color: "text-foreground" },
];

const modules = [
  { title: "Produção", description: "OS, peças e estações", url: "/producao", icon: Factory },
  { title: "Logística", description: "Romaneios e expedições", url: "/logistica", icon: Truck },
  { title: "Registros", description: "Ocorrências e reposições", url: "/registros", icon: FileText },
  { title: "Dashboard", description: "Indicadores e analytics", url: "/dashboard", icon: BarChart3 },
  { title: "Admin", description: "Relatórios e configurações", url: "/admin", icon: Settings, adminOnly: true },
  { title: "Configurações", description: "Listas e parâmetros", url: "/admin/configuracoes", icon: Wrench, adminOnly: true },
];

export default function Index() {
  const { profile } = useAuth();
  const isAdmin = profile?.perfil === "admin";
  const visibleModules = modules.filter((m) => !m.adminOnly || isAdmin);

  return (
    <AppLayout title="Início">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-lg border p-4 animate-fade-in">
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
              <mod.icon className="h-5 w-5 text-secondary group-hover:text-foreground transition-colors" />
              <span className="font-medium text-foreground">{mod.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
