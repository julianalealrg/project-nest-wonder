import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Download } from "lucide-react";
import { exportLogisticaExcel } from "@/lib/exportExcel";
import { LogisticaKPI } from "@/components/logistica/LogisticaKPI";
import { LogisticaFilters } from "@/components/logistica/LogisticaFilters";
import { RomaneioTable } from "@/components/logistica/RomaneioTable";
import { RomaneioPanel } from "@/components/logistica/RomaneioPanel";
import { NovoRomaneioDialog } from "@/components/logistica/NovoRomaneioDialog";
import { useRomaneios, Romaneio } from "@/hooks/useRomaneios";

export default function Logistica() {
  const [search, setSearch] = useState("");
  const [rota, setRota] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [selectedRomaneio, setSelectedRomaneio] = useState<Romaneio | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: romaneios = [], isLoading } = useRomaneios();

  const currentSelected = useMemo(() => {
    if (!selectedRomaneio) return null;
    return romaneios.find((r) => r.id === selectedRomaneio.id) || null;
  }, [selectedRomaneio, romaneios]);

  const filtered = useMemo(() => {
    return romaneios.filter((r) => {
      const q = search.toLowerCase();
      if (q && !r.codigo.toLowerCase().includes(q) && !r.os_codigos.some((c) => c.toLowerCase().includes(q)) && !r.cliente_nome.toLowerCase().includes(q)) return false;
      if (rota !== "todos" && r.tipo_rota !== rota) return false;
      if (status !== "todos" && r.status !== status) return false;
      return true;
    });
  }, [romaneios, search, rota, status]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["romaneios"] });
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
  }

  return (
    <AppLayout
      title="Logística"
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportLogisticaExcel(filtered)}><Download className="h-4 w-4 mr-1" />Exportar</Button>
          <Button size="sm" onClick={() => setNovoOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo Romaneio</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <LogisticaKPI romaneios={romaneios} />

        <LogisticaFilters
          search={search} onSearchChange={setSearch}
          rota={rota} onRotaChange={setRota}
          status={status} onStatusChange={setStatus}
        />

        <div className="text-xs text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</span>
          ) : (
            `${filtered.length} romaneio${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`
          )}
        </div>

        <RomaneioTable data={filtered} onSelect={setSelectedRomaneio} />
      </div>

      <RomaneioPanel romaneio={currentSelected} onClose={() => setSelectedRomaneio(null)} onChanged={handleRefresh} />
      <NovoRomaneioDialog open={novoOpen} onOpenChange={setNovoOpen} onSuccess={handleRefresh} />
    </AppLayout>
  );
}
