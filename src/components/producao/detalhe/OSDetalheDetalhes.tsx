import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { MockOS } from "@/data/mockProducao";
import { AreaField } from "./OSDetalheGeral";

interface Props {
  os: MockOS;
  onChanged?: () => void;
}

/**
 * Popover com informações de catálogo da OS — consulta esporádica.
 * Substitui parte da antiga aba Geral. Acionado por botão pequeno ao lado do código da OS.
 */
export function OSDetalheDetalhes({ os, onChanged }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
          <Info className="h-3.5 w-3.5 mr-1" /> Detalhes
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-4 space-y-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Informações da OS</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Material" value={os.material} />
          <Field label="Ambiente" value={os.ambiente} />
          <Field label="Supervisor" value={os.supervisor} />
          <Field label="Projetista" value={os.projetista} />
          <Field label="Data Emissão" value={os.data_emissao ? new Date(os.data_emissao).toLocaleDateString("pt-BR") : "—"} />
          <Field label="Data Entrega" value={os.data_entrega ? new Date(os.data_entrega).toLocaleDateString("pt-BR") : "—"} />
          {os.terceiro && (
            <div className="col-span-2">
              <Field label="Terceiro" value={os.terceiro} />
            </div>
          )}
        </div>
        <Separator />
        <AreaField os={os} onChanged={() => onChanged?.()} />
      </PopoverContent>
    </Popover>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <p className="text-[13px] text-foreground">{value || "—"}</p>
    </div>
  );
}
