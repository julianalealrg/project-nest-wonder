import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { REGISTRO_STATUS_LABELS, REGISTRO_URGENCIA_LABELS } from "@/lib/registroTransitions";

interface RegistroFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  origem: string;
  onOrigemChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  urgencia: string;
  onUrgenciaChange: (v: string) => void;
  tipo: string;
  onTipoChange: (v: string) => void;
  supervisor: string;
  onSupervisorChange: (v: string) => void;
  projetista: string;
  onProjetistaChange: (v: string) => void;
  projetos: string;
  onProjetosChange: (v: string) => void;
  recolha: string;
  onRecolhaChange: (v: string) => void;
  tipos: string[];
}

const SUPERVISORES = ["Gino", "Maurício", "Gustavo"];
const PROJETISTAS = ["Letícia", "Lucas", "Rebeca", "Izabeli"];

export function RegistroFilters({
  search, onSearchChange,
  origem, onOrigemChange,
  status, onStatusChange,
  urgencia, onUrgenciaChange,
  tipo, onTipoChange,
  supervisor, onSupervisorChange,
  projetista, onProjetistaChange,
  projetos, onProjetosChange,
  recolha, onRecolhaChange,
  tipos,
}: RegistroFiltersProps) {
  const [advOpen, setAdvOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código, OS ou cliente..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={origem} onValueChange={onOrigemChange}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas origens</SelectItem>
            <SelectItem value="obra">Obra</SelectItem>
            <SelectItem value="fabrica">Fábrica</SelectItem>
            <SelectItem value="solicitacao">Solicitação</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {Object.entries(REGISTRO_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={urgencia} onValueChange={onUrgenciaChange}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas urgências</SelectItem>
            {Object.entries(REGISTRO_URGENCIA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Filtros avançados
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={tipo} onValueChange={onTipoChange}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Supervisor</Label>
              <Select value={supervisor} onValueChange={onSupervisorChange}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {SUPERVISORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Projetista</Label>
              <Select value={projetista} onValueChange={onProjetistaChange}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {PROJETISTAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Demanda Projetos</Label>
              <Select value={projetos} onValueChange={onProjetosChange}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Com demanda</SelectItem>
                  <SelectItem value="nao">Sem demanda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Recolha</Label>
              <Select value={recolha} onValueChange={onRecolhaChange}>
                <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
