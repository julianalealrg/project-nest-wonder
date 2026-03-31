import { MockOS, STATUS_LABELS } from "@/data/mockProducao";
import { Badge } from "@/components/ui/badge";

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

export function OSTable({ data, onSelect }: OSTableProps) {
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
                      <Badge variant="outline" className="text-xs font-medium">
                        {STATUS_LABELS[os.status] || os.status}
                      </Badge>
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
