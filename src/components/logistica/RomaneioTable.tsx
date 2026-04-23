import { Romaneio, ROTA_LABELS, ROMANEIO_STATUS_LABELS } from "@/hooks/useRomaneios";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RomaneioTableProps {
  data: Romaneio[];
  onSelect: (r: Romaneio) => void;
}

export function RomaneioTable({ data, onSelect }: RomaneioTableProps) {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Romaneio</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rota</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">OS</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Motorista</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum romaneio encontrado.
                </td>
              </tr>
            ) : (
              data.map((rom) => {
                const statusColors: Record<string, string> = {
                  pendente: "bg-muted text-muted-foreground",
                  em_transito: "bg-blue-100 text-blue-700",
                  entregue: "bg-green-100 text-green-700",
                };
                return (
                  <tr
                    key={rom.id}
                    onClick={() => onSelect(rom)}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{rom.codigo}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-muted text-muted-foreground">
                        {ROTA_LABELS[rom.tipo_rota] || rom.tipo_rota}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs hidden sm:table-cell max-w-[200px] truncate">
                      {rom.os_codigos.length === 0 ? (
                        "—"
                      ) : rom.os_codigos.length <= 2 ? (
                        rom.os_codigos.join(", ")
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help" onClick={(e) => e.stopPropagation()}>
                                {rom.os_codigos[0]}{" "}
                                <span className="text-muted-foreground/70">+{rom.os_codigos.length - 1}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="text-xs">{rom.os_codigos.join(", ")}</div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground hidden md:table-cell truncate max-w-[200px]">
                      {rom.cliente_nome}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {rom.motorista || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rom.status] || ""}`}>
                        {ROMANEIO_STATUS_LABELS[rom.status] || rom.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {rom.data_saida ? new Date(rom.data_saida).toLocaleDateString("pt-BR") : new Date(rom.created_at).toLocaleDateString("pt-BR")}
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
