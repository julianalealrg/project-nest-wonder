import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ROTA_LABELS, ROMANEIO_STATUS_LABELS, getRotasPorCategoria, type CategoriaRota } from "@/hooks/useRomaneios";

interface LogisticaFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  rota: string;
  onRotaChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  /** Restringe as opções de rota à categoria ativa. */
  categoria?: CategoriaRota;
}

export function LogisticaFilters({
  search, onSearchChange,
  rota, onRotaChange,
  status, onStatusChange,
  categoria = "todas",
}: LogisticaFiltersProps) {
  const rotasDisponiveis = getRotasPorCategoria(categoria);

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar romaneio, OS ou cliente..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <Select value={rota} onValueChange={onRotaChange}>
        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas rotas</SelectItem>
          {rotasDisponiveis.map((k) => (
            <SelectItem key={k} value={k}>{ROTA_LABELS[k] || k}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos status</SelectItem>
          {Object.entries(ROMANEIO_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
