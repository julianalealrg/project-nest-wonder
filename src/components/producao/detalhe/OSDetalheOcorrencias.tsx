import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, Image as ImageIcon } from "lucide-react";
import { MockOS } from "@/data/mockProducao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { NovoRegistroDialog } from "@/components/registros/NovoRegistroDialog";

interface RegistroDaOS {
  id: string;
  codigo: string;
  origem: string;
  tipo: string | null;
  status: string;
  urgencia: string;
  acao_produtiva: string | null;
  quantidade_afetada: number | null;
  justificativa: string | null;
  fotos: string[];
  romaneio_id: string | null;
  peca_id: string | null;
  os_gerada_id: string | null;
  created_at: string;
  peca_item: string | null;
  peca_descricao: string | null;
}

const ORIGEM_LABEL: Record<string, string> = {
  obra: "Ocorrência (Obra)",
  fabrica: "Ocorrência (Fábrica)",
  solicitacao: "Solicitação de Reposição",
};

const ACAO_LABEL: Record<string, string> = {
  cortar_nova: "Cortar nova",
  cortar_retrabalhar: "Cortar e retrabalhar",
  apenas_retrabalho: "Apenas retrabalho",
  nenhuma: "Sem ação",
};

interface Props {
  os: MockOS;
  onChanged?: () => void;
}

export function OSDetalheOcorrencias({ os, onChanged }: Props) {
  const [registros, setRegistros] = useState<RegistroDaOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);
  const [presetOrigem, setPresetOrigem] = useState<"fabrica" | "solicitacao" | undefined>(undefined);

  async function fetchRegistros() {
    setLoading(true);
    const { data, error } = await supabase
      .from("registros")
      .select(`
        id, codigo, origem, tipo, status, urgencia, acao_produtiva,
        quantidade_afetada, justificativa, fotos, romaneio_id, peca_id,
        os_gerada_id, created_at,
        pecas ( item, descricao )
      `)
      .eq("os_id", os.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRegistros(
        data.map((r: any) => ({
          ...r,
          fotos: r.fotos || [],
          peca_item: r.pecas?.item ?? null,
          peca_descricao: r.pecas?.descricao ?? null,
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => { fetchRegistros(); }, [os.id]);

  function abrirNovo(origem?: "fabrica" | "solicitacao") {
    setPresetOrigem(origem);
    setNovoOpen(true);
  }

  const pendentes = useMemo(
    () => registros.filter((r) => r.status !== "resolvido" && !r.acao_produtiva),
    [registros],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Ocorrências e Solicitações ({registros.length})
          </h3>
          {pendentes.length > 0 && (
            <p className="mt-1 text-xs text-destructive">
              {pendentes.length} pendente(s) sem encaminhamento — bloqueia avanço para Acabamento.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => abrirNovo("fabrica")}>
            <Plus className="mr-1 h-4 w-4" /> Ocorrência Fábrica
          </Button>
          <Button size="sm" onClick={() => abrirNovo("solicitacao")}>
            <Plus className="mr-1 h-4 w-4" /> Solicitação Reposição
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : registros.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada nesta OS.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {registros.map((r) => {
            const semAcao = !r.acao_produtiva;
            const resolvido = r.status === "resolvido";
            return (
              <div key={r.id} className={`rounded-md border bg-card p-3 ${semAcao && !resolvido ? "border-destructive/40" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground text-[13px]">{r.codigo}</span>
                  <Badge variant="outline" className="text-[10px]">{ORIGEM_LABEL[r.origem] || r.origem}</Badge>
                  {r.tipo && <span className="text-xs text-muted-foreground">{r.tipo}</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                {(r.peca_item || r.peca_descricao) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Peça {r.peca_item || "?"}: {r.peca_descricao || ""}
                    {r.quantidade_afetada ? ` — qtd afetada: ${r.quantidade_afetada}` : ""}
                  </p>
                )}

                {r.justificativa && (
                  <p className="mt-1.5 text-xs text-foreground">{r.justificativa}</p>
                )}

                {r.fotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.fotos.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="h-14 w-14 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {r.acao_produtiva ? (
                    <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">
                      Encaminhado: {ACAO_LABEL[r.acao_produtiva] || r.acao_produtiva}
                    </Badge>
                  ) : resolvido ? (
                    <Badge className="text-[10px] bg-muted text-muted-foreground">Resolvido</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">
                      Pendente — sem encaminhamento
                    </Badge>
                  )}
                  {r.os_gerada_id && (
                    <span className="text-[11px] text-muted-foreground">→ OS gerada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NovoRegistroDialog
        open={novoOpen}
        onOpenChange={(v) => { setNovoOpen(v); if (!v) setPresetOrigem(undefined); }}
        presetOsCodigo={os.codigo}
        presetOrigem={presetOrigem}
        onSuccess={() => { fetchRegistros(); onChanged?.(); }}
      />
    </div>
  );
}
