import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Loader2, Download, List, LayoutGrid } from "lucide-react";
import { exportProducaoExcel } from "@/lib/exportExcel";
import { OSFilters } from "@/components/producao/OSFilters";
import { OSTable } from "@/components/producao/OSTable";
import { OSKanban } from "@/components/producao/OSKanban";
import { NovaOSDialog } from "@/components/producao/NovaOSDialog";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

const VIEW_STORAGE_KEY = "producao_view";
type ProducaoView = "lista" | "kanban";

export default function Producao() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [localizacao, setLocalizacao] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [cliente, setCliente] = useState("todos");
  const [material, setMaterial] = useState("todos");
  const [cortador, setCortador] = useState("todos");
  const [acabador, setAcabador] = useState("todos");
  const [novaOSOpen, setNovaOSOpen] = useState(false);
  const [view, setView] = useState<ProducaoView>(() => {
    if (typeof window === "undefined") return "lista";
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "kanban" ? "kanban" : "lista";
  });

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const queryClient = useQueryClient();
  const { data: osList = [], isLoading } = useOrdensServico();

  // Realtime: refresh OS list when DB changes
  useRealtimeInvalidate([
    { table: "ordens_servico", queryKeys: [["ordens_servico"], ["home-kpis"]] },
    { table: "pecas", queryKeys: [["ordens_servico"]] },
  ]);

  const clientes = useMemo(() => [...new Set(osList.map((o) => o.cliente))], [osList]);
  const materiais = useMemo(() => [...new Set(osList.map((o) => o.material).filter(Boolean))], [osList]);
  const cortadores = useMemo(() => {
    const set = new Set<string>();
    osList.forEach((o) => o.pecas.forEach((p) => p.cortador && set.add(p.cortador)));
    return [...set];
  }, [osList]);
  const acabadores = useMemo(() => {
    const set = new Set<string>();
    osList.forEach((o) => o.pecas.forEach((p) => p.acabador && set.add(p.acabador)));
    return [...set];
  }, [osList]);

  const filtered = useMemo(() => {
    return osList.filter((os) => {
      const q = search.toLowerCase();
      if (q && !os.codigo.toLowerCase().includes(q) && !os.cliente.toLowerCase().includes(q)) return false;
      if (tipo !== "todos" && (os.origem || "os").toLowerCase() !== tipo) return false;
      if (localizacao !== "todos" && os.localizacao !== localizacao) return false;
      if (status !== "todos" && os.status !== status) return false;
      if (cliente !== "todos" && os.cliente !== cliente) return false;
      if (material !== "todos" && os.material !== material) return false;
      if (cortador !== "todos" && !os.pecas.some((p) => p.cortador === cortador)) return false;
      if (acabador !== "todos" && !os.pecas.some((p) => p.acabador === acabador)) return false;
      return true;
    });
  }, [osList, search, tipo, localizacao, status, cliente, material, cortador, acabador]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
  }

  return (
    <AppLayout
      title="Produção"
      action={
        <div className="flex gap-2 items-center">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as ProducaoView)}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="lista" aria-label="Visualização em lista">
              <List className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Lista</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Visualização em kanban">
              <LayoutGrid className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" variant="outline" onClick={() => exportProducaoExcel(filtered)}>
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={() => setNovaOSOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Nova OS</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <OSFilters
          search={search} onSearchChange={setSearch}
          tipo={tipo} onTipoChange={setTipo}
          localizacao={localizacao} onLocalizacaoChange={setLocalizacao}
          status={status} onStatusChange={setStatus}
          cliente={cliente} onClienteChange={setCliente}
          material={material} onMaterialChange={setMaterial}
          cortador={cortador} onCortadorChange={setCortador}
          acabador={acabador} onAcabadorChange={setAcabador}
          clientes={clientes} materiais={materiais}
          cortadores={cortadores} acabadores={acabadores}
        />

        <div className="text-xs text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</span>
          ) : (
            `${filtered.length} orden${filtered.length !== 1 ? "s" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`
          )}
        </div>

        {view === "lista" ? (
          <OSTable data={filtered} onStatusChanged={handleRefresh} />
        ) : (
          <OSKanban data={filtered} />
        )}
      </div>

      <NovaOSDialog open={novaOSOpen} onOpenChange={setNovaOSOpen} onSuccess={handleRefresh} />
    </AppLayout>
  );
}
