import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OSFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  localizacao: string;
  onLocalizacaoChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  cliente: string;
  onClienteChange: (v: string) => void;
  material: string;
  onMaterialChange: (v: string) => void;
  cortador: string;
  onCortadorChange: (v: string) => void;
  acabador: string;
  onAcabadorChange: (v: string) => void;
  clientes: string[];
  materiais: string[];
  cortadores: string[];
  acabadores: string[];
}

export function OSFilters(props: OSFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3">
      {/* Primary filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar OS ou cliente..."
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={props.localizacao} onValueChange={props.onLocalizacaoChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Localização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Base 1">Base 1</SelectItem>
            <SelectItem value="Base 2">Base 2</SelectItem>
            <SelectItem value="Trânsito">Trânsito</SelectItem>
            <SelectItem value="Cliente">Cliente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={props.status} onValueChange={props.onStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aguardando_chapa">Ag. Chapa</SelectItem>
            <SelectItem value="fila_corte">Fila Corte</SelectItem>
            <SelectItem value="cortando">Cortando</SelectItem>
            <SelectItem value="enviado_base2">Env. B2</SelectItem>
            <SelectItem value="acabamento">Acabamento</SelectItem>
            <SelectItem value="cq">CQ</SelectItem>
            <SelectItem value="expedicao">Expedição</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="terceiros">Terceiros</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 self-center"
        >
          Filtros
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-4 p-3 bg-card rounded-lg border animate-fade-in">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <Select value={props.cliente} onValueChange={props.onClienteChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {props.clientes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Material</label>
            <Select value={props.material} onValueChange={props.onMaterialChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os materiais</SelectItem>
                {props.materiais.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cortador</label>
            <Select value={props.cortador} onValueChange={props.onCortadorChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Cortador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {props.cortadores.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Acabador</label>
            <Select value={props.acabador} onValueChange={props.onAcabadorChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Acabador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {props.acabadores.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
