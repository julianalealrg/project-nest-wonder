import { useState } from "react";
import { MockOS, STATUS_LABELS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import { getNextStatuses, STATUS_LABELS as TRANSITION_LABELS } from "@/lib/statusTransitions";
import { changeOSStatus } from "@/lib/changeOSStatus";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { StatusChangeDialog } from "./StatusChangeDialog";

function renderEntrega(dataEntrega: string | null, status: string) {
  if (status === "entregue" || !dataEntrega) {
    return dataEntrega
      ? <span className="text-muted-foreground text-xs">{new Date(dataEntrega).toLocaleDateString("pt-BR")}</span>
      : <span className="text-muted-foreground text-xs">—</span>;
  }
  const diff = Math.ceil((new Date(dataEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const formatted = new Date(dataEntrega).toLocaleDateString("pt-BR");
  if (diff < 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{formatted}</span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-destructive text-destructive-foreground">Atrasado</span>
      </div>
    );
  }
  if (diff <= 10) {
    return <span className="text-xs text-destructive font-medium">{formatted}</span>;
  }
  return <span className="text-xs text-muted-foreground">{formatted}</span>;
}

interface OSTableProps {
  data: MockOS[];
  onSelect: (os: MockOS) => void;
  onStatusChanged?: () => void;
}

function getOrigemTag(origem: string) {
  const map: Record<string, { label: string; className: string }> = {
    os: { label: "OS", className: "bg-muted text-muted-foreground" },
    rep: { label: "REP", className: "bg-blue-100 text-blue-700" },
    oc: { label: "OC", className: "bg-purple-100 text-purple-700" },
    of: { label: "OF", className: "bg-stone-200 text-stone-600" },
  };
  const tag = map[origem] || map.os;
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.className}`}>{tag.label}</span>;
}

function getDaysInactive(updatedAt: string): number {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getRowBg(days: number, status: string): string {
  if (status === "entregue") return "";
  if (days >= 5) return "bg-red-50";
  if (days >= 3) return "bg-yellow-50";
  return "";
}

function StatusDropdown({ os, onStatusChanged }: { os: MockOS; onStatusChanged?: () => void }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const nextStatuses = getNextStatuses(os.status);

  if (nextStatuses.length === 0) {
    return (
      <Badge variant="outline" className="text-xs font-medium">
        {STATUS_LABELS[os.status] || os.status}
      </Badge>
    );
  }

  function handleSelect(newStatus: string) {
    setPendingStatus(newStatus);
    setPopoverOpen(false);
    setDialogOpen(true);
  }

  async function handleConfirm(extraFields: Record<string, string>) {
    setLoading(true);
    try {
      await changeOSStatus({
        osId: os.id,
        osCodigo: os.codigo,
        fromStatus: os.status,
        toStatus: pendingStatus,
        userName: profile?.nome || "Sistema",
        extraFields,
      });
      toast({ title: `${os.codigo}: ${TRANSITION_LABELS[pendingStatus]}` });
      setDialogOpen(false);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao mudar status", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors">
            {STATUS_LABELS[os.status] || os.status}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] text-muted-foreground px-2 py-1 uppercase tracking-wider">Avançar para</p>
          {nextStatuses.map((ns) => (
            <Button
              key={ns}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-8"
              onClick={() => handleSelect(ns)}
            >
              {TRANSITION_LABELS[ns] || ns}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      <StatusChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        osCodigo={os.codigo}
        fromStatus={os.status}
        toStatus={pendingStatus}
        loading={loading}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export function OSTable({ data, onSelect, onStatusChanged }: OSTableProps) {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">OS</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Ambiente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Material</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Peças</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Local</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Entrega</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Dias</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground">
                  Nenhuma OS encontrada.
                </td>
              </tr>
            ) : (
              data.map((os) => {
                const days = getDaysInactive(os.updated_at);
                const donePecas = os.pecas.filter((p) => p.status_cq === "aprovado").length;
                const totalPecas = os.pecas.length;
                const rowBg = getRowBg(days, os.status);

                return (
                  <tr
                    key={os.id}
                    onClick={() => onSelect(os)}
                    className={`border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40 ${rowBg}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getOrigemTag(os.origem)}
                        <span className="font-medium text-foreground">{os.codigo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground hidden sm:table-cell truncate max-w-[200px]">
                      {os.cliente}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {os.ambiente}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate max-w-[180px]">
                      {os.material}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-foreground font-medium">{donePecas}</span>
                      <span className="text-muted-foreground">/{totalPecas}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown os={os} onStatusChanged={onStatusChanged} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {os.localizacao}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {renderEntrega(os.data_entrega, os.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {days >= 5 ? (
                        <span className="text-destructive font-semibold">{days}d</span>
                      ) : days >= 3 ? (
                        <span className="text-yellow-600 font-semibold">{days}d</span>
                      ) : (
                        <span className="text-muted-foreground">{days}d</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
