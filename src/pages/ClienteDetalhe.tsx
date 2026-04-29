import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  Hash,
  Briefcase,
  Trash2,
} from "lucide-react";
import { useCliente, useOSDoCliente } from "@/hooks/useClientes";
import { ClienteDialog } from "@/components/clientes/ClienteDialog";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { osBadgeClass } from "@/lib/statusColors";
import { getOrigemTagInfo } from "@/lib/origemTag";
import { STATUS_LABELS } from "@/data/mockProducao";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cliente, isLoading } = useCliente(id);
  const { data: osList = [] } = useOSDoCliente(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = profile?.perfil === "admin";

  async function handleDelete() {
    if (!cliente) return;
    setDeleting(true);
    try {
      if (osList.length > 0) {
        toast({
          title: "Não dá pra apagar",
          description: `Esse cliente tem ${osList.length} OS vinculada(s). Apague ou desvincule as OS primeiro.`,
          variant: "destructive",
        });
        setDeleting(false);
        setDeleteOpen(false);
        return;
      }
      const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "exclusao_cliente",
        entity_type: "clientes",
        entity_id: cliente.id,
        entity_description: cliente.nome,
        user_name: profile?.nome || "Admin",
        details: { cnpj_cpf: cliente.cnpj_cpf },
      });

      toast({ title: `${cliente.nome} excluído` });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      navigate("/clientes");
    } catch (err: any) {
      toast({ title: "Erro ao excluir cliente", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!cliente) {
    return (
      <AppLayout title="Cliente não encontrado">
        <div className="text-center py-20 space-y-4">
          <p className="text-muted-foreground">Cliente não localizado.</p>
          <Button variant="outline" onClick={() => navigate("/clientes")}>
            Voltar para clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalArea = osList.reduce((acc, os) => acc + (os.area_m2 || 0), 0);
  const osAtivas = osList.filter((os) => os.status !== "entregue").length;

  return (
    <AppLayout
      title={cliente.nome}
      action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
              title="Excluir cliente (admin)"
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header com KPIs */}
        <div className="bg-card border rounded-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <h2 className="font-display text-2xl text-foreground">{cliente.nome}</h2>
            {cliente.cnpj_cpf && (
              <span className="font-mono text-sm text-muted-foreground">{cliente.cnpj_cpf}</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4">
            <KPI label="Total de OS" value={osList.length.toString()} />
            <KPI label="OS ativas" value={osAtivas.toString()} />
            <KPI label="m² acumulado" value={totalArea > 0 ? `${totalArea.toFixed(2)}` : "—"} />
            <KPI
              label="Cliente desde"
              value={new Date(cliente.created_at).toLocaleDateString("pt-BR")}
            />
          </div>
        </div>

        {/* Dados de contato */}
        <div className="bg-card border rounded-lg p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Dados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <DataRow icon={User} label="Supervisor" value={cliente.supervisor} />
            <DataRow icon={Briefcase} label="Arquiteta" value={cliente.arquiteta} />
            <DataRow icon={Phone} label="Telefone" value={cliente.telefone} />
            <DataRow icon={Mail} label="E-mail" value={cliente.email} />
            <DataRow icon={Hash} label="Contato adicional" value={cliente.contato} />
            <DataRow icon={MapPin} label="Endereço" value={cliente.endereco} />
          </div>
          {cliente.observacoes && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Observações</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap mt-1">
                    {cliente.observacoes}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OS vinculadas */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">
              OS vinculadas{" "}
              <span className="text-muted-foreground font-normal">({osList.length})</span>
            </h3>
          </div>
          {osList.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhuma OS vinculada a este cliente ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">OS</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                      Ambiente
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                      Material
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                      m²
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                      Entrega
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {osList.map((os) => {
                    const tag = getOrigemTagInfo(os.origem || "os");
                    return (
                      <tr key={os.id} className={`border-b last:border-b-0 hover:bg-muted/30 ${tag.rowClass}`}>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.badgeClass}`}
                          >
                            {tag.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            to={`/producao/${os.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {os.codigo}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                          {os.ambiente || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell truncate max-w-[160px]">
                          {os.material || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                          {os.area_m2 ? `${Number(os.area_m2).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${osBadgeClass(os.status)}`}
                          >
                            {STATUS_LABELS[os.status] || os.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">
                          {os.data_entrega
                            ? new Date(os.data_entrega).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ClienteDialog open={editOpen} onOpenChange={setEditOpen} cliente={cliente} />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Excluir cliente ${cliente.nome}?`}
        confirmText={cliente.nome}
        loading={deleting}
        onConfirm={handleDelete}
        description={
          <div>
            Vai apagar o cadastro de <strong>{cliente.nome}</strong>.
            {osList.length > 0 ? (
              <>
                <br />
                <span className="font-semibold text-destructive">
                  Bloqueado: este cliente tem {osList.length} OS vinculada(s).
                </span>
                <br />
                Apague ou desvincule as OS primeiro.
              </>
            ) : (
              <>
                <br />
                <span className="font-semibold text-destructive">Esta ação é irreversível.</span>
              </>
            )}
          </div>
        }
      />
    </AppLayout>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-xl text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function DataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground uppercase">{label}</div>
        <div className="text-sm text-foreground truncate">{value || "—"}</div>
      </div>
    </div>
  );
}
