import { useNavigate } from "react-router-dom";
import { MockOS, STATUS_LABELS } from "@/data/mockProducao";
import { osBadgeClass } from "@/lib/statusColors";
import { getOrigemTagInfo } from "@/lib/origemTag";
import { formatDuracaoCurta, corNivelTempo } from "@/lib/tempoEstacao";
import { Clock } from "lucide-react";

const KANBAN_COLUNAS = [
  "aguardando_material",
  "fila_corte",
  "cortando",
  "enviado_base2",
  "acabamento",
  "cq",
  "expedicao",
  "entregue",
] as const;

const ENTREGUE_DIAS_VISIVEL = 5;

interface OSKanbanProps {
  data: MockOS[];
}

function getDaysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isVisivelNoKanban(os: MockOS): boolean {
  if (os.status !== "entregue") return true;
  return getDaysSince(os.updated_at) <= ENTREGUE_DIAS_VISIVEL;
}

function OSCard({ os, onClick }: { os: MockOS; onClick: () => void }) {
  const tag = getOrigemTagInfo(os.origem);
  const ocorrenciasPendentes = (os.registros || []).filter(
    (r) => r.status !== "resolvido" && !r.acao_produtiva,
  ).length;
  const emTransito = (os.romaneios || []).some((r) => r.status === "em_transito");
  const isAtrasado =
    !!os.data_entrega &&
    os.status !== "entregue" &&
    new Date(os.data_entrega).getTime() < Date.now();
  const donePecas = os.pecas.filter((p) => p.status_cq === "aprovado").length;
  const totalPecas = os.pecas.length;
  const pecasReprovadas = os.pecas.filter((p) => p.status_cq === "reprovado").length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-card border rounded-lg p-3 hover:shadow-md hover:border-nue-azul/40 transition-all ${tag.rowClass}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tag.badgeClass}`}
        >
          {tag.label}
        </span>
        <span className="font-display text-base font-medium text-foreground leading-none">
          {os.codigo}
        </span>
      </div>

      <div className="text-sm font-medium text-foreground truncate mb-0.5">
        {os.cliente}
      </div>
      <div className="text-xs text-muted-foreground truncate mb-2">
        {os.ambiente}
        {os.material ? ` · ${os.material}` : ""}
      </div>

      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <span className="text-muted-foreground">
          Peças <span className="font-medium text-foreground">{donePecas}</span>
          /{totalPecas}
        </span>
        {os.data_entrega && (
          <span className="text-muted-foreground">
            {new Date(os.data_entrega).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {os.status !== "entregue" && (
        <TempoNaEstacao updatedAt={os.updated_at} />
      )}

      {(ocorrenciasPendentes > 0 ||
        emTransito ||
        isAtrasado ||
        pecasReprovadas > 0 ||
        os.status === "terceiros_recusado") && (
        <div className="flex flex-wrap items-center gap-1">
          {os.status === "terceiros_recusado" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-nue-vermelho text-white">
              Terceiro recusou
            </span>
          )}
          {isAtrasado && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-destructive text-destructive-foreground">
              Atrasado
            </span>
          )}
          {pecasReprovadas > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-nue-vermelho text-white">
              Retrabalho ({pecasReprovadas})
            </span>
          )}
          {ocorrenciasPendentes > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-nue-vermelho text-white">
              Ocorrência ({ocorrenciasPendentes})
            </span>
          )}
          {emTransito && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-nue-azul text-white">
              Em trânsito
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export function OSKanban({ data }: OSKanbanProps) {
  const navigate = useNavigate();
  const handleClick = (os: MockOS) => navigate(`/producao/${os.id}`);

  const terceirosOSs = data.filter((os) => os.status === "terceiros");
  const recusadasOSs = data.filter((os) => os.status === "terceiros_recusado");
  const retornoB1OSs = data.filter((os) => os.status === "enviado_base1");
  const fluxoOSs = data.filter(
    (os) =>
      os.status !== "terceiros" &&
      os.status !== "terceiros_recusado" &&
      os.status !== "enviado_base1" &&
      isVisivelNoKanban(os),
  );

  const grupos: Record<string, MockOS[]> = {};
  KANBAN_COLUNAS.forEach((s) => (grupos[s] = []));
  fluxoOSs.forEach((os) => {
    if (grupos[os.status]) grupos[os.status].push(os);
  });

  const totalFluxo = fluxoOSs.length;
  const ocultosEntregue =
    data.filter((os) => os.status === "entregue").length -
    (grupos.entregue?.length || 0);

  return (
    <div className="space-y-4">
      {/* Faixa horizontal de Terceiros */}
      <div className="bg-card border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-nue-chumbo text-white">
              Terceiros
            </span>
            <span className="text-muted-foreground font-normal">
              ({terceirosOSs.length})
            </span>
            {recusadasOSs.length > 0 && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-nue-vermelho text-white">
                  Recusados
                </span>
                <span className="text-muted-foreground font-normal">
                  ({recusadasOSs.length})
                </span>
              </>
            )}
          </h3>
        </div>
        {terceirosOSs.length === 0 && recusadasOSs.length === 0 ? (
          <div className="text-xs text-muted-foreground italic px-1">
            Nenhuma OS em terceiros
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recusadasOSs.map((os) => (
              <div key={os.id} className="min-w-[240px] max-w-[280px] flex-shrink-0">
                <OSCard os={os} onClick={() => handleClick(os)} />
              </div>
            ))}
            {terceirosOSs.map((os) => (
              <div key={os.id} className="min-w-[240px] max-w-[280px] flex-shrink-0">
                <OSCard os={os} onClick={() => handleClick(os)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faixa horizontal de Retorno à B1 (só aparece quando houver) */}
      {retornoB1OSs.length > 0 && (
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-nue-azul text-white">
                Retorno à B1
              </span>
              <span className="text-muted-foreground font-normal">
                ({retornoB1OSs.length})
              </span>
              <span className="text-[11px] text-muted-foreground italic font-normal">
                em trânsito B2 → B1 pra refazer corte/usinagem
              </span>
            </h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {retornoB1OSs.map((os) => (
              <div key={os.id} className="min-w-[240px] max-w-[280px] flex-shrink-0">
                <OSCard os={os} onClick={() => handleClick(os)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Colunas do fluxo principal */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUNAS.map((status) => {
          const osDaColuna = grupos[status];
          const isEntregue = status === "entregue";
          const headerLabel = isEntregue
            ? `${STATUS_LABELS[status]} (≤${ENTREGUE_DIAS_VISIVEL}d)`
            : STATUS_LABELS[status];
          return (
            <div
              key={status}
              className="min-w-[260px] flex-1 flex flex-col bg-muted/30 rounded-lg p-2"
            >
              <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${osBadgeClass(status)}`}
                >
                  {headerLabel}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {osDaColuna.length}
                </span>
              </div>
              <div
                className="flex flex-col gap-2 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 360px)" }}
              >
                {osDaColuna.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic px-1 py-2">
                    —
                  </div>
                ) : (
                  osDaColuna.map((os) => (
                    <OSCard
                      key={os.id}
                      os={os}
                      onClick={() => handleClick(os)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-muted-foreground px-1">
        {totalFluxo} OS no fluxo
        {ocultosEntregue > 0
          ? ` · ${ocultosEntregue} entregue${ocultosEntregue !== 1 ? "s" : ""} há mais de ${ENTREGUE_DIAS_VISIVEL} dias (oculta${ocultosEntregue !== 1 ? "s" : ""})`
          : ""}
      </div>
    </div>
  );
}

function TempoNaEstacao({ updatedAt }: { updatedAt: string }) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const nivel = corNivelTempo(ms);
  const cls =
    nivel === "vermelho"
      ? "bg-nue-vermelho text-white"
      : nivel === "amarelo"
        ? "bg-nue-amarelo text-nue-chumbo"
        : "bg-muted text-muted-foreground";
  return (
    <div
      className={`mb-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}
      title={`Última atualização há ${formatDuracaoCurta(ms)}`}
    >
      <Clock className="h-3 w-3" />
      Há {formatDuracaoCurta(ms)} nesta etapa
    </div>
  );
}
