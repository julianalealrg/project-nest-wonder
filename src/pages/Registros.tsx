import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Download } from "lucide-react";
import { exportRegistrosExcel } from "@/lib/exportExcel";
import { RegistroFilters } from "@/components/registros/RegistroFilters";
import { RegistroTable } from "@/components/registros/RegistroTable";
import { RegistroPanel } from "@/components/registros/RegistroPanel";
import { NovoRegistroDialog } from "@/components/registros/NovoRegistroDialog";
import { useRegistros, Registro } from "@/hooks/useRegistros";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export default function Registros() {
  const [search, setSearch] = useState("");
  const [origem, setOrigem] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [urgencia, setUrgencia] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [supervisor, setSupervisor] = useState("todos");
  const [projetista, setProjetista] = useState("todos");
  const [projetos, setProjetosState] = useState(() => {
    if (typeof window === "undefined") return "todos";
    return localStorage.getItem("registros:filter:projetos") || "todos";
  });
  const setProjetos = (v: string) => {
    setProjetosState(v);
    try { localStorage.setItem("registros:filter:projetos", v); } catch {}
  };
  const [recolha, setRecolha] = useState("todos");
  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: registros = [], isLoading } = useRegistros();

  // Realtime: refresh registros list and home KPIs when DB changes
  useRealtimeInvalidate([
    { table: "registros", queryKeys: [["registros"], ["home-kpis"]] },
    { table: "registro_pecas", queryKeys: [["registros"]] },
    { table: "evidencias", queryKeys: [["registros"]] },
  ]);

  const tipos = useMemo(() => [...new Set(registros.map((r) => r.tipo).filter(Boolean) as string[])], [registros]);

  const currentSelected = useMemo(() => {
    if (!selectedRegistro) return null;
    return registros.find((r) => r.id === selectedRegistro.id) || null;
  }, [selectedRegistro, registros]);

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      const q = search.toLowerCase();
      if (q && !r.codigo.toLowerCase().includes(q) && !(r.numero_os || "").toLowerCase().includes(q) && !(r.cliente || "").toLowerCase().includes(q)) return false;
      if (origem !== "todos" && r.origem !== origem) return false;
      if (status !== "todos" && r.status !== status) return false;
      if (urgencia !== "todos" && r.urgencia !== urgencia) return false;
      if (tipo !== "todos" && r.tipo !== tipo) return false;
      if (supervisor !== "todos" && r.supervisor !== supervisor) return false;
      if (projetista !== "todos" && r.projetista !== projetista) return false;
      if (projetos === "sim" && !r.encaminhar_projetos) return false;
      if (projetos === "nao" && r.encaminhar_projetos) return false;
      if (recolha === "sim" && !r.requer_recolha) return false;
      if (recolha === "nao" && r.requer_recolha) return false;
      return true;
    });
  }, [registros, search, origem, status, urgencia, tipo, supervisor, projetista, projetos, recolha]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["registros"] });
  }

  return (
    <AppLayout
      title="Registros"
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportRegistrosExcel(filtered)}>
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Novo Registro</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <RegistroFilters
          search={search} onSearchChange={setSearch}
          origem={origem} onOrigemChange={setOrigem}
          status={status} onStatusChange={setStatus}
          urgencia={urgencia} onUrgenciaChange={setUrgencia}
          tipo={tipo} onTipoChange={setTipo}
          supervisor={supervisor} onSupervisorChange={setSupervisor}
          projetista={projetista} onProjetistaChange={setProjetista}
          projetos={projetos} onProjetosChange={setProjetos}
          recolha={recolha} onRecolhaChange={setRecolha}
          tipos={tipos}
        />

        <div className="text-xs text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</span>
          ) : (
            `${filtered.length} registro${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`
          )}
        </div>

        <RegistroTable data={filtered} onSelect={setSelectedRegistro} onStatusChanged={handleRefresh} />
      </div>

      <RegistroPanel registro={currentSelected} onClose={() => setSelectedRegistro(null)} onStatusChanged={handleRefresh} />
      <NovoRegistroDialog open={novoOpen} onOpenChange={setNovoOpen} onSuccess={handleRefresh} />
    </AppLayout>
  );
}
