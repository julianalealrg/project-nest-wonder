import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  origem: string; onOrigemChange: (v: string) => void;
  periodo: string; onPeriodoChange: (v: string) => void;
  supervisor: string; onSupervisorChange: (v: string) => void;
  projetista: string; onProjetistaChange: (v: string) => void;
  urgencia: string; onUrgenciaChange: (v: string) => void;
}

export function DashboardFilters(props: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Origem</label>
        <Select value={props.origem} onValueChange={props.onOrigemChange}>
          <SelectTrigger className="w-[140px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="obra">Obra</SelectItem>
            <SelectItem value="fabrica">Fábrica</SelectItem>
            <SelectItem value="solicitacao">Solicitação</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Período</label>
        <Select value={props.periodo} onValueChange={props.onPeriodoChange}>
          <SelectTrigger className="w-[120px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Supervisor</label>
        <Select value={props.supervisor} onValueChange={props.onSupervisorChange}>
          <SelectTrigger className="w-[140px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Gino">Gino</SelectItem>
            <SelectItem value="Maurício">Maurício</SelectItem>
            <SelectItem value="Gustavo">Gustavo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Projetista</label>
        <Select value={props.projetista} onValueChange={props.onProjetistaChange}>
          <SelectTrigger className="w-[140px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Letícia">Letícia</SelectItem>
            <SelectItem value="Lucas">Lucas</SelectItem>
            <SelectItem value="Rebeca">Rebeca</SelectItem>
            <SelectItem value="Izabeli">Izabeli</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Urgência</label>
        <Select value={props.urgencia} onValueChange={props.onUrgenciaChange}>
          <SelectTrigger className="w-[120px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
