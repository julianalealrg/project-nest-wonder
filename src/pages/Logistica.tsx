import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Download, Truck, Home } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { exportLogisticaExcel } from "@/lib/exportExcel";
import { LogisticaKPI } from "@/components/logistica/LogisticaKPI";
import { LogisticaFilters } from "@/components/logistica/LogisticaFilters";
import { RomaneioTable } from "@/components/logistica/RomaneioTable";
import { RomaneioPanel } from "@/components/logistica/RomaneioPanel";
import { NovoRomaneioDialog } from "@/components/logistica/NovoRomaneioDialog";
import {
  useRomaneios,
  Romaneio,
  getRotasPorCategoria,
  type CategoriaRota,
} from "@/hooks/useRomaneios";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

const TAB_STORAGE_KEY = "logistica:tab";

export default function Logistica() {
  const [tab, setTab] = useState<CategoriaRota>(() => {
    if (typeof window === "undefined") return "interna";
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    return saved === "expedicao" || saved === "interna" ? saved : "interna";
  });

  // Filtros independentes por aba
  const [searchInt, setSearchInt] = useState("");
  const [rotaInt, setRotaInt] = useState("todos");
  const [statusInt, setStatusInt] = useState("todos");

  const [searchExp, setSearchExp] = useState("");
  const [rotaExp, setRotaExp] = useState("todos");
  const [statusExp, setStatusExp] = useState("todos");

  const [selectedRomaneio, setSelectedRomaneio] = useState<Romaneio | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: romaneios = [], isLoading } = useRomaneios();

  useRealtimeInvalidate([
    { table: "romaneios", queryKeys: [["romaneios"], ["home-kpis"]] },
    { table: "romaneio_pecas", queryKeys: [["romaneios"]] },
    { table: "ordens_servico", queryKeys: [["ordens_servico"], ["home-kpis"]] },
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    }
  }, [tab]);

  const currentSelected = useMemo(() => {
    if (!selectedRomaneio) return null;
    return romaneios.find((r) => r.id === selectedRomaneio.id) || null;
  }, [selectedRomaneio, romaneios]);

  const rotasInternas = getRotasPorCategoria("interna");
  const rotasExpedicao = getRotasPorCategoria("expedicao");

  const romaneiosInternos = useMemo(
    () => romaneios.filter((r) => rotasInternas.includes(r.tipo_rota)),
    [romaneios],
  );
  const romaneiosExpedicao = useMemo(
    () => romaneios.filter((r) => rotasExpedicao.includes(r.tipo_rota)),
    [romaneios],
  );

  const filteredInternos = useMemo(() => {
    return romaneiosInternos.filter((r) => {
      const q = searchInt.toLowerCase();
      if (q && !r.codigo.toLowerCase().includes(q) && !r.os_codigos.some((c) => c.toLowerCase().includes(q)) && !r.cliente_nome.toLowerCase().includes(q)) return false;
      if (rotaInt !== "todos" && r.tipo_rota !== rotaInt) return false;
      if (statusInt !== "todos" && r.status !== statusInt) return false;
      return true;
    });
  }, [romaneiosInternos, searchInt, rotaInt, statusInt]);

  const filteredExpedicao = useMemo(() => {
    return romaneiosExpedicao.filter((r) => {
      const q = searchExp.toLowerCase();
      if (q && !r.codigo.toLowerCase().includes(q) && !r.os_codigos.some((c) => c.toLowerCase().includes(q)) && !r.cliente_nome.toLowerCase().includes(q)) return false;
      if (rotaExp !== "todos" && r.tipo_rota !== rotaExp) return false;
      if (statusExp !== "todos" && r.status !== statusExp) return false;
      return true;
    });
  }, [romaneiosExpedicao, searchExp, rotaExp, statusExp]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["romaneios"] });
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
  }

  // Para exportar/criar, usa a aba ativa
  const isInterna = tab === "interna";
  const filteredAtivo = isInterna ? filteredInternos : filteredExpedicao;
  const allowedRotas = isInterna ? rotasInternas : rotasExpedicao;

  return (
    <AppLayout
      title="Logística"
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportLogisticaExcel(filteredAtivo)}>
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Novo Romaneio</span>
          </Button>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as CategoriaRota)} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="interna" className="gap-2">
            <Truck className="h-4 w-4" />
            Logística Interna
          </TabsTrigger>
          <TabsTrigger value="expedicao" className="gap-2">
            <Home className="h-4 w-4" />
            Expedição Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interna" className="space-y-4 mt-0">
          <div
            className="rounded-lg border px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: "#2980B915", borderColor: "#2980B940" }}
          >
            <Truck className="h-4 w-4" style={{ color: "#2980B9" }} />
            <span className="text-sm font-medium" style={{ color: "#2980B9" }}>
              Movimentação entre bases e recolhas
            </span>
          </div>

          <LogisticaKPI romaneios={romaneios} categoria="interna" />

          <LogisticaFilters
            search={searchInt} onSearchChange={setSearchInt}
            rota={rotaInt} onRotaChange={setRotaInt}
            status={statusInt} onStatusChange={setStatusInt}
            categoria="interna"
          />

          <div className="text-xs text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</span>
            ) : (
              `${filteredInternos.length} romaneio${filteredInternos.length !== 1 ? "s" : ""} encontrado${filteredInternos.length !== 1 ? "s" : ""}`
            )}
          </div>

          <RomaneioTable data={filteredInternos} onSelect={setSelectedRomaneio} />
        </TabsContent>

        <TabsContent value="expedicao" className="space-y-4 mt-0">
          <div
            className="rounded-lg border px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: "#27AE6015", borderColor: "#27AE6040" }}
          >
            <Home className="h-4 w-4" style={{ color: "#27AE60" }} />
            <span className="text-sm font-medium" style={{ color: "#27AE60" }}>
              Entregas finais ao cliente
            </span>
          </div>

          <LogisticaKPI romaneios={romaneios} categoria="expedicao" />

          <LogisticaFilters
            search={searchExp} onSearchChange={setSearchExp}
            rota={rotaExp} onRotaChange={setRotaExp}
            status={statusExp} onStatusChange={setStatusExp}
            categoria="expedicao"
          />

          <div className="text-xs text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</span>
            ) : (
              `${filteredExpedicao.length} romaneio${filteredExpedicao.length !== 1 ? "s" : ""} encontrado${filteredExpedicao.length !== 1 ? "s" : ""}`
            )}
          </div>

          <RomaneioTable data={filteredExpedicao} onSelect={setSelectedRomaneio} />
        </TabsContent>
      </Tabs>

      <RomaneioPanel romaneio={currentSelected} onClose={() => setSelectedRomaneio(null)} onChanged={handleRefresh} />
      <NovoRomaneioDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        onSuccess={handleRefresh}
        allowedRotas={allowedRotas}
      />
    </AppLayout>
  );
}
