import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Check, X, ArrowRight, AlertTriangle } from "lucide-react";
import { useClientes, type ClienteComResumo } from "@/hooks/useClientes";
import { detectarDuplicados, type ParCandidato } from "@/lib/clienteSimilarity";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const IGNORADOS_STORAGE_KEY = "clientes_mesclar_ignorados";

function loadIgnorados(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(IGNORADOS_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveIgnorados(set: Set<string>) {
  window.sessionStorage.setItem(IGNORADOS_STORAGE_KEY, JSON.stringify([...set]));
}

function parKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function motivoLabel(motivo: string): string {
  if (motivo === "igual") return "Nomes idênticos (ignorando acentos/caixa)";
  if (motivo === "substring") return "Um nome contém o outro";
  return "Nomes muito parecidos (1-3 letras de diferença)";
}

export default function ClientesMesclar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: clientes = [], isLoading } = useClientes();
  const [ignorados, setIgnorados] = useState<Set<string>>(loadIgnorados);
  const [mesclando, setMesclando] = useState<string | null>(null);

  const pares = useMemo(() => {
    const todos = detectarDuplicados(clientes);
    return todos.filter((p) => !ignorados.has(parKey(p.a.id, p.b.id)));
  }, [clientes, ignorados]);

  function ignorarPar(par: ParCandidato<ClienteComResumo>) {
    const key = parKey(par.a.id, par.b.id);
    const novo = new Set(ignorados);
    novo.add(key);
    setIgnorados(novo);
    saveIgnorados(novo);
  }

  async function executarMerge(
    par: ParCandidato<ClienteComResumo>,
    keep: ClienteComResumo,
    remove: ClienteComResumo,
  ) {
    const key = parKey(par.a.id, par.b.id);
    setMesclando(key);
    try {
      // Coalesce: preserva campos do removido se o mantido estiver vazio
      const updates: Record<string, unknown> = {};
      const fields: (keyof ClienteComResumo)[] = [
        "cnpj_cpf",
        "email",
        "telefone",
        "contato",
        "endereco",
        "supervisor",
        "arquiteta",
        "observacoes",
      ];
      for (const f of fields) {
        if (!keep[f] && remove[f]) updates[f as string] = remove[f];
      }

      if (Object.keys(updates).length > 0) {
        const { error: updErr } = await supabase
          .from("clientes")
          .update(updates)
          .eq("id", keep.id);
        if (updErr) throw updErr;
      }

      const { error: osErr } = await supabase
        .from("ordens_servico")
        .update({ cliente_id: keep.id })
        .eq("cliente_id", remove.id);
      if (osErr) throw osErr;

      const { error: delErr } = await supabase
        .from("clientes")
        .delete()
        .eq("id", remove.id);
      if (delErr) throw delErr;

      toast({
        title: "Clientes mesclados",
        description: `${remove.total_os} OS movida${remove.total_os !== 1 ? "s" : ""} para "${keep.nome}"`,
      });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
    } catch (err: any) {
      toast({
        title: "Erro ao mesclar",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setMesclando(null);
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Mesclar Duplicados">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Mesclar Clientes Duplicados"
      action={
        <Button size="sm" variant="outline" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="bg-card border rounded-lg p-4 text-sm text-muted-foreground">
          <p className="mb-2">
            Detecção automática por nome (ignora acentos/caixa, tolera 1-3 letras de diferença).
            Escolha qual cliente manter — o outro é apagado e todas as OS dele migram pro mantido.
            Campos vazios no mantido são preenchidos com os dados do removido.
          </p>
          <p className="text-xs">
            Total: <span className="font-semibold text-foreground">{pares.length}</span> par
            {pares.length !== 1 ? "es" : ""} a revisar
            {ignorados.size > 0 && (
              <>
                {" · "}
                <button
                  onClick={() => {
                    setIgnorados(new Set());
                    saveIgnorados(new Set());
                  }}
                  className="underline"
                >
                  desfazer {ignorados.size} ignorados
                </button>
              </>
            )}
          </p>
        </div>

        {pares.length === 0 ? (
          <div className="bg-card border rounded-lg p-12 text-center">
            <Check className="h-12 w-12 mx-auto text-nue-verde mb-3" />
            <p className="text-foreground font-medium">Nenhum duplicado detectado.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sua base de clientes está limpa.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pares.map((par) => {
              const key = parKey(par.a.id, par.b.id);
              const isMesclando = mesclando === key;
              return (
                <div key={key} className="bg-card border rounded-lg p-4">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-nue-amarelo flex-shrink-0 mt-0.5" />
                    <span>{motivoLabel(par.motivo)}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ClienteCard
                      cliente={par.a}
                      onKeep={() => executarMerge(par, par.a, par.b)}
                      disabled={isMesclando}
                    />
                    <ClienteCard
                      cliente={par.b}
                      onKeep={() => executarMerge(par, par.b, par.a)}
                      disabled={isMesclando}
                    />
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => ignorarPar(par)}
                      disabled={isMesclando}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Não são duplicados
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ClienteCard({
  cliente,
  onKeep,
  disabled,
}: {
  cliente: ClienteComResumo;
  onKeep: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border rounded-md p-3 flex flex-col gap-2 bg-muted/20">
      <div>
        <div className="font-medium text-foreground">{cliente.nome}</div>
        {cliente.cnpj_cpf && (
          <div className="text-xs font-mono text-muted-foreground">{cliente.cnpj_cpf}</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <Field label="OS" value={cliente.total_os.toString()} />
        <Field label="m²" value={cliente.area_m2_total > 0 ? cliente.area_m2_total.toFixed(2) : "—"} />
        <Field label="Supervisor" value={cliente.supervisor || "—"} />
        <Field label="Arquiteta" value={cliente.arquiteta || "—"} />
        <Field label="Telefone" value={cliente.telefone || "—"} />
        <Field label="E-mail" value={cliente.email || "—"} />
        <Field
          label="Última atividade"
          value={
            cliente.ultima_atividade
              ? new Date(cliente.ultima_atividade).toLocaleDateString("pt-BR")
              : "—"
          }
        />
        <Field
          label="Cadastrado em"
          value={new Date(cliente.created_at).toLocaleDateString("pt-BR")}
        />
      </div>
      <Button size="sm" onClick={onKeep} disabled={disabled} className="mt-2">
        {disabled ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
        Manter este, mesclar o outro aqui
      </Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase text-[9px]">{label}</div>
      <div className="text-foreground truncate">{value}</div>
    </div>
  );
}
