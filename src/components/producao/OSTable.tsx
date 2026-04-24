import { useNavigate } from "react-router-dom";
import { MockOS, STATUS_LABELS } from "@/data/mockProducao";
import { calcularSugestaoAvanco, calcularDependencia } from "@/lib/avancoSugerido";
import { osBadgeClass } from "@/lib/statusColors";
import { getOrigemTagInfo } from "@/lib/origemTag";

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
  onSelect?: (os: MockOS) => void;
  onStatusChanged?: () => void;
}

function getDaysInactive(updatedAt: string): number {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getInactivityRowBg(days: number, status: string): string {
  if (status === "entregue") return "";
  if (days >= 5) return "bg-red-50";
  if (days >= 3) return "bg-yellow-50";
  return "";
}

export function OSTable({ data, onSelect }: OSTableProps) {
  const navigate = useNavigate();
  const handleRowClick = (os: MockOS) => {
    if (onSelect) onSelect(os);
    else navigate(`/producao/${os.id}`);
  };
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">OS</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Ambiente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Material</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Peças</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[120px]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Local</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Entrega</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Dias</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  Nenhuma OS encontrada.
                </td>
              </tr>
            ) : (
              data.map((os) => {
                const days = getDaysInactive(os.updated_at);
                const donePecas = os.pecas.filter((p) => p.status_cq === "aprovado").length;
                const totalPecas = os.pecas.length;
                const inactivityBg = getInactivityRowBg(days, os.status);
                const tag = getOrigemTagInfo(os.origem);
                // Inatividade tem prioridade visual sobre cor de tipo
                const rowBg = inactivityBg || tag.rowClass;

                return (
                  <tr
                    key={os.id}
                    onClick={() => handleRowClick(os)}
                    className={`border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40 ${rowBg}`}
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.badgeClass}`}>
                        {tag.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{os.codigo}</span>
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
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${osBadgeClass(os.status)}`}>
                          {STATUS_LABELS[os.status] || os.status}
                        </span>
                        {(() => {
                          const sugestao = calcularSugestaoAvanco(os);
                          if (!sugestao) return null;
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap bg-nue-verde/15 text-nue-verde">
                              Pronta {sugestao.label}
                            </span>
                          );
                        })()}
                        {(() => {
                          const dep = calcularDependencia(os);
                          if (!dep) return null;
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap bg-nue-amarelo/15 text-nue-amarelo">
                              {dep.label}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {os.localizacao}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {renderEntrega(os.data_entrega, os.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {days >= 5 ? (
                        <span className="text-nue-vermelho font-semibold">{days}d</span>
                      ) : days >= 3 ? (
                        <span className="text-nue-amarelo font-semibold">{days}d</span>
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
