import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Search } from "lucide-react";
import { useClientes, type ClienteComResumo, type Cliente } from "@/hooks/useClientes";
import { ClienteDialog } from "@/components/clientes/ClienteDialog";

export default function Clientes() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.cnpj_cpf || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.telefone || "").toLowerCase().includes(q),
    );
  }, [clientes, search]);

  function handleNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleSuccess(id: string) {
    if (!editing) navigate(`/clientes/${id}`);
  }

  return (
    <AppLayout
      title="Clientes"
      action={
        <Button size="sm" onClick={handleNew}>
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Novo Cliente</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ/CPF, email, telefone..."
            className="pl-9"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
            </span>
          ) : (
            `${filtered.length} cliente${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`
          )}
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Supervisor</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Arquiteta</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">OS</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">m² total</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ocorrências</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <ClienteRow
                      key={c.id}
                      cliente={c}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cliente={editing}
        onSuccess={handleSuccess}
      />
    </AppLayout>
  );
}

function ClienteRow({
  cliente,
  onClick,
}: {
  cliente: ClienteComResumo;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40"
    >
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{cliente.nome}</div>
        {cliente.cnpj_cpf && (
          <div className="text-xs text-muted-foreground font-mono">{cliente.cnpj_cpf}</div>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
        {cliente.supervisor || "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
        {cliente.arquiteta || "—"}
      </td>
      <td className="px-4 py-3 text-center font-medium text-foreground">{cliente.total_os}</td>
      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
        {cliente.area_m2_total > 0 ? `${cliente.area_m2_total.toFixed(2)} m²` : "—"}
      </td>
      <td className="px-4 py-3 text-center">
        {cliente.ocorrencias_abertas > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-nue-vermelho text-white">
            {cliente.ocorrencias_abertas}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
        {cliente.ultima_atividade
          ? new Date(cliente.ultima_atividade).toLocaleDateString("pt-BR")
          : "—"}
      </td>
    </tr>
  );
}
