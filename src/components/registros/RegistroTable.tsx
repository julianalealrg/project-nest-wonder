import { useState } from "react";
import { Registro } from "@/hooks/useRegistros";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  getNextRegistroStatuses,
  REGISTRO_STATUS_LABELS,
  REGISTRO_ORIGEM_LABELS,
  REGISTRO_URGENCIA_LABELS,
} from "@/lib/registroTransitions";
import { changeRegistroStatus } from "@/lib/changeRegistroStatus";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface RegistroTableProps {
  data: Registro[];
  onSelect: (r: Registro) => void;
  onStatusChanged?: () => void;
}

function OrigemBadge({ origem }: { origem: string }) {
  const tag = REGISTRO_ORIGEM_LABELS[origem] || { label: origem.toUpperCase(), className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.className}`}>
      {tag.label}
    </span>
  );
}

function UrgenciaBadge({ urgencia }: { urgencia: string }) {
  const colors: Record<string, string> = {
    baixa: "bg-muted text-muted-foreground",
    media: "bg-muted text-foreground",
    alta: "bg-destructive/10 text-destructive",
    critica: "bg-destructive text-destructive-foreground",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${colors[urgencia] || colors.media}`}>
      {REGISTRO_URGENCIA_LABELS[urgencia] || urgencia}
    </span>
  );
}

function StatusDropdown({ registro, onStatusChanged }: { registro: Registro; onStatusChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const nextStatuses = getNextRegistroStatuses(registro.status);

  if (nextStatuses.length === 0) {
    return (
      <Badge variant="outline" className="text-xs font-medium">
        {REGISTRO_STATUS_LABELS[registro.status] || registro.status}
      </Badge>
    );
  }

  async function handleChange(newStatus: string) {
    setLoading(true);
    try {
      await changeRegistroStatus({
        registroId: registro.id,
        registroCodigo: registro.codigo,
        fromStatus: registro.status,
        toStatus: newStatus,
        userName: profile?.nome || "Sistema",
      });
      toast({ title: `${registro.codigo}: ${REGISTRO_STATUS_LABELS[newStatus]}` });
      setOpen(false);
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao mudar status", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {REGISTRO_STATUS_LABELS[registro.status] || registro.status}
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
            disabled={loading}
            onClick={() => handleChange(ns)}
          >
            {REGISTRO_STATUS_LABELS[ns] || ns}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function RegistroTable({ data, onSelect, onStatusChanged }: RegistroTableProps) {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">OS</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Tipo</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Urgência</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              data.map((reg) => (
                <tr
                  key={reg.id}
                  onClick={() => onSelect(reg)}
                  className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <OrigemBadge origem={reg.origem} />
                      <span className="font-medium text-foreground">{reg.codigo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground hidden sm:table-cell">
                    {reg.numero_os || "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground hidden md:table-cell truncate max-w-[200px]">
                    {reg.cliente || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {reg.tipo || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <UrgenciaBadge urgencia={reg.urgencia} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown registro={reg} onStatusChanged={onStatusChanged} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {new Date(reg.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
