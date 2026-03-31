import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { mockOSList, MockOS } from "@/data/mockProducao";
import { OSFilters } from "@/components/producao/OSFilters";
import { OSTable } from "@/components/producao/OSTable";
import { OSPanel } from "@/components/producao/OSPanel";
import { NovaOSDialog } from "@/components/producao/NovaOSDialog";

export default function Producao() {
  const [search, setSearch] = useState("");
  const [localizacao, setLocalizacao] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [cliente, setCliente] = useState("todos");
  const [material, setMaterial] = useState("todos");
  const [cortador, setCortador] = useState("todos");
  const [acabador, setAcabador] = useState("todos");
  const [selectedOS, setSelectedOS] = useState<MockOS | null>(null);
  const [novaOSOpen, setNovaOSOpen] = useState(false);

  const clientes = useMemo(() => [...new Set(mockOSList.map((o) => o.cliente))], []);
  const materiais = useMemo(() => [...new Set(mockOSList.map((o) => o.material))], []);
  const cortadores = useMemo(() => {
    const set = new Set<string>();
    mockOSList.forEach((o) => o.pecas.forEach((p) => p.cortador && set.add(p.cortador)));
    return [...set];
  }, []);
  const acabadores = useMemo(() => {
    const set = new Set<string>();
    mockOSList.forEach((o) => o.pecas.forEach((p) => p.acabador && set.add(p.acabador)));
    return [...set];
  }, []);

  const filtered = useMemo(() => {
    return mockOSList.filter((os) => {
      const q = search.toLowerCase();
      if (q && !os.codigo.toLowerCase().includes(q) && !os.cliente.toLowerCase().includes(q)) return false;
      if (localizacao !== "todos" && os.localizacao !== localizacao) return false;
      if (status !== "todos" && os.status !== status) return false;
      if (cliente !== "todos" && os.cliente !== cliente) return false;
      if (material !== "todos" && os.material !== material) return false;
      if (cortador !== "todos" && !os.pecas.some((p) => p.cortador === cortador)) return false;
      if (acabador !== "todos" && !os.pecas.some((p) => p.acabador === acabador)) return false;
      return true;
    });
  }, [search, localizacao, status, cliente, material, cortador, acabador]);

  return (
    <AppLayout
      title="Produção"
      action={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova OS</Button>}
    >
      <div className="space-y-4">
        <OSFilters
          search={search} onSearchChange={setSearch}
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
          {filtered.length} ordem{filtered.length !== 1 ? "ns" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
        </div>

        <OSTable data={filtered} onSelect={setSelectedOS} />
      </div>

      <OSPanel os={selectedOS} onClose={() => setSelectedOS(null)} />
    </AppLayout>
  );
}
