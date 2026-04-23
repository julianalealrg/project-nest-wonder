import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfWeek, format, differenceInDays } from "date-fns";

interface DashboardFilters {
  origem: string;
  periodo: string;
  supervisor: string;
  projetista: string;
  urgencia: string;
}

function getPeriodStart(periodo: string): Date | null {
  if (periodo === "7d") return subDays(new Date(), 7);
  if (periodo === "30d") return subDays(new Date(), 30);
  if (periodo === "90d") return subDays(new Date(), 90);
  return null;
}

export function useDashboardData(filters: DashboardFilters) {
  const registrosQuery = useQuery({
    queryKey: ["dashboard-registros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("registros").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const osQuery = useQuery({
    queryKey: ["dashboard-os"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome, supervisor), pecas(id, acabador, cortador)");
      if (error) throw error;
      return data || [];
    },
  });

  const logsQuery = useQuery({
    queryKey: ["dashboard-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_logs").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = registrosQuery.isLoading || osQuery.isLoading || logsQuery.isLoading;
  const registros = registrosQuery.data || [];
  const ordens = osQuery.data || [];

  // Apply filters to registros
  const periodStart = getPeriodStart(filters.periodo);
  const filteredRegistros = registros.filter((r) => {
    if (filters.origem !== "todos" && r.origem !== filters.origem) return false;
    if (filters.supervisor !== "todos" && r.supervisor !== filters.supervisor) return false;
    if (filters.projetista !== "todos" && r.projetista !== filters.projetista) return false;
    if (filters.urgencia !== "todos" && r.urgencia !== filters.urgencia) return false;
    if (periodStart && new Date(r.created_at) < periodStart) return false;
    return true;
  });

  const filteredOS = ordens.filter((o: any) => {
    if (filters.supervisor !== "todos" && o.clientes?.supervisor !== filters.supervisor) return false;
    if (filters.projetista !== "todos" && o.projetista !== filters.projetista) return false;
    if (periodStart && new Date(o.created_at) < periodStart) return false;
    return true;
  });

  // KPIs
  const registrosAbertos = filteredRegistros.filter((r) => r.status !== "resolvido").length;
  const osEmProducao = filteredOS.filter((o: any) => !["entregue"].includes(o.status)).length;
  const totalRegistros = filteredRegistros.length;
  const resolvidos = filteredRegistros.filter((r) => r.status === "resolvido").length;
  const taxaResolucao = totalRegistros > 0 ? Math.round((resolvidos / totalRegistros) * 100) : 0;

  // Tempo médio de produção
  const entregues = filteredOS.filter((o: any) => o.status === "entregue");
  const tempoMedio = entregues.length > 0
    ? Math.round(entregues.reduce((sum: number, o: any) => sum + differenceInDays(new Date(o.updated_at), new Date(o.created_at)), 0) / entregues.length)
    : 0;

  // Chart: Ranking por tipo
  const tipoCount = new Map<string, number>();
  filteredRegistros.forEach((r) => {
    const t = r.tipo || "Sem tipo";
    tipoCount.set(t, (tipoCount.get(t) || 0) + 1);
  });
  const rankingTipo = Array.from(tipoCount.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Chart: Tendência por semana (criados vs resolvidos)
  const weekMap = new Map<string, { criados: number; resolvidos: number }>();
  filteredRegistros.forEach((r) => {
    const w = format(startOfWeek(new Date(r.created_at), { weekStartsOn: 1 }), "dd/MM");
    const entry = weekMap.get(w) || { criados: 0, resolvidos: 0 };
    entry.criados++;
    weekMap.set(w, entry);
  });
  filteredRegistros.filter((r) => r.status === "resolvido").forEach((r) => {
    const w = format(startOfWeek(new Date(r.updated_at), { weekStartsOn: 1 }), "dd/MM");
    const entry = weekMap.get(w) || { criados: 0, resolvidos: 0 };
    entry.resolvidos++;
    weekMap.set(w, entry);
  });
  const tendenciaSemanal = Array.from(weekMap.entries()).map(([semana, v]) => ({ semana, ...v }));

  // Chart: Por supervisor
  const supMap = new Map<string, number>();
  filteredRegistros.forEach((r) => {
    const s = r.supervisor || "Sem supervisor";
    supMap.set(s, (supMap.get(s) || 0) + 1);
  });
  const porSupervisor = Array.from(supMap.entries()).map(([name, value]) => ({ name, value }));

  // Chart: Erros por projetista
  const projMap = new Map<string, number>();
  filteredRegistros.forEach((r) => {
    const p = r.projetista || "Sem projetista";
    projMap.set(p, (projMap.get(p) || 0) + 1);
  });
  const porProjetista = Array.from(projMap.entries()).map(([name, value]) => ({ name, value }));

  // Chart: Acabadores - OS finalizadas vs quebras
  const acabadorMap = new Map<string, { finalizadas: number; quebras: number }>();
  filteredOS.forEach((o: any) => {
    (o.pecas || []).forEach((p: any) => {
      if (p.acabador) {
        const entry = acabadorMap.get(p.acabador) || { finalizadas: 0, quebras: 0 };
        if (o.status === "Entregue") entry.finalizadas++;
        acabadorMap.set(p.acabador, entry);
      }
    });
  });
  filteredRegistros.filter((r) => r.tipo === "Quebra no acabamento" || r.tipo === "Erro de acabamento").forEach((r) => {
    const a = r.acabador_responsavel || "Desconhecido";
    const entry = acabadorMap.get(a) || { finalizadas: 0, quebras: 0 };
    entry.quebras++;
    acabadorMap.set(a, entry);
  });
  const acabadores = Array.from(acabadorMap.entries()).map(([name, v]) => ({ name, ...v }));

  // Chart: Urgência (pizza)
  const urgMap = new Map<string, number>();
  filteredRegistros.forEach((r) => {
    urgMap.set(r.urgencia, (urgMap.get(r.urgencia) || 0) + 1);
  });
  const porUrgencia = Array.from(urgMap.entries()).map(([name, value]) => ({ name, value }));

  // Chart: OS por status (pizza)
  const statusMap = new Map<string, number>();
  filteredOS.forEach((o: any) => {
    statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
  });
  const osPorStatus = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

  return {
    isLoading,
    kpis: { registrosAbertos, osEmProducao, taxaResolucao, tempoMedio },
    charts: { rankingTipo, tendenciaSemanal, porSupervisor, porProjetista, acabadores, porUrgencia, osPorStatus },
  };
}
