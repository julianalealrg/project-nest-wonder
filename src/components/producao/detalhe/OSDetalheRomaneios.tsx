import { useMemo, useState } from "react";
import { Plus, Truck } from "lucide-react";
import { MockOS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRomaneios, ROTA_LABELS, ROMANEIO_STATUS_LABELS } from "@/hooks/useRomaneios";
import { NovoRomaneioDialog } from "@/components/logistica/NovoRomaneioDialog";
import { RomaneioPanel } from "@/components/logistica/RomaneioPanel";

interface Props {
  os: MockOS;
  onStatusChanged?: () => void;
}

export function OSDetalheRomaneios({ os, onStatusChanged }: Props) {
  const { data: allRomaneios = [], refetch } = useRomaneios();
  const [novoOpen, setNovoOpen] = useState(false);
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);

  const osRomaneios = useMemo(() => {
    const codigos = new Set(os.romaneios.map((r) => r.codigo));
    return allRomaneios.filter((r) => codigos.has(r.codigo));
  }, [allRomaneios, os.romaneios]);

  const selectedRomaneio = useMemo(
    () => (selectedCodigo ? allRomaneios.find((r) => r.codigo === selectedCodigo) ?? null : null),
    [allRomaneios, selectedCodigo],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Romaneios vinculados ({osRomaneios.length})
        </h3>
        <Button size="sm" onClick={() => setNovoOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Novo Romaneio
        </Button>
      </div>

      {osRomaneios.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 p-8 text-center">
          <Truck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum romaneio vinculado a esta OS.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {osRomaneios.map((rom) => (
            <button
              key={rom.codigo}
              type="button"
              onClick={() => setSelectedCodigo(rom.codigo)}
              className="flex w-full items-center justify-between gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium text-foreground text-[13px]">{rom.codigo}</span>
                <span className="text-[11px] text-muted-foreground">{ROTA_LABELS[rom.tipo_rota] || rom.tipo_rota}</span>
                {rom.data_saida && (
                  <span className="text-[11px] text-muted-foreground">
                    Saída: {new Date(rom.data_saida).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {ROMANEIO_STATUS_LABELS[rom.status] || rom.status}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <NovoRomaneioDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        presetOsId={os.id}
        onSuccess={() => { refetch(); onStatusChanged?.(); }}
      />

      {selectedRomaneio && (
        <RomaneioPanel
          romaneio={selectedRomaneio}
          asDialog
          onClose={() => setSelectedCodigo(null)}
          onChanged={() => { refetch(); onStatusChanged?.(); }}
        />
      )}
    </div>
  );
}
