import { useState } from "react";
import { X, FileText, ChevronRight, Loader2, AlertTriangle, Truck, Palette } from "lucide-react";
import { Registro } from "@/hooks/useRegistros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  getNextRegistroStatuses,
  REGISTRO_STATUS_LABELS,
  REGISTRO_ORIGEM_LABELS,
  REGISTRO_URGENCIA_LABELS,
} from "@/lib/registroTransitions";
import { changeRegistroStatus } from "@/lib/changeRegistroStatus";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { gerarPDFRegistroCompleto, gerarPDFRegistroProducao } from "@/lib/pdfRegistro";

interface RegistroPanelProps {
  registro: Registro | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export function RegistroPanel({ registro, onClose, onStatusChanged }: RegistroPanelProps) {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  if (!registro) return null;

  const nextStatuses = getNextRegistroStatuses(registro.status);
  const origemTag = REGISTRO_ORIGEM_LABELS[registro.origem] || { label: registro.origem, className: "bg-muted text-muted-foreground" };

  async function handleStatusChange(newStatus: string) {
    if (!registro) return;
    setLoading(true);
    try {
      await changeRegistroStatus({
        registroId: registro.id,
        registroCodigo: registro.codigo,
        fromStatus: registro.status,
        toStatus: newStatus,
        userName: profile?.nome || "Sistema",
      });
      toast({ title: `${registro.codigo}: ${REGISTRO_STATUS_LABELS[newStatus]}` });
      onStatusChanged?.();
    } catch (err: any) {
      toast({ title: "Erro ao mudar status", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[460px] bg-card border-l z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-foreground">{registro.codigo}</h2>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${origemTag.className}`}>
                {origemTag.label}
              </span>
              {registro.encaminhar_projetos && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-100 text-purple-700">
                  <Palette className="h-2.5 w-2.5" /> PROJETOS
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{registro.cliente || "—"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">OS</span>
                <p className="text-foreground font-medium">{registro.numero_os || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Material</span>
                <p className="text-foreground font-medium">{registro.material || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Ambiente</span>
                <p className="text-foreground font-medium">{registro.ambiente || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Supervisor</span>
                <p className="text-foreground">{registro.supervisor || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Projetista</span>
                <p className="text-foreground">{registro.projetista || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Aberto por</span>
                <p className="text-foreground">{registro.aberto_por || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Data</span>
                <p className="text-foreground">{new Date(registro.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${registroBadgeClass(registro.status)}`}>
                  {REGISTRO_STATUS_LABELS[registro.status] || registro.status}
                </span>
              </div>
            </div>

            <Separator />

            {/* Classification */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Classificação</h3>
              <div className="flex flex-wrap gap-2">
                {registro.tipo && (
                  <Badge variant="secondary" className="text-xs">
                    {registro.tipo}{registro.tipo_outro ? `: ${registro.tipo_outro}` : ""}
                  </Badge>
                )}
                <Badge variant={registro.urgencia === "alta" || registro.urgencia === "critica" ? "destructive" : "outline"} className="text-xs">
                  {REGISTRO_URGENCIA_LABELS[registro.urgencia] || registro.urgencia}
                </Badge>
              </div>
              {(registro.responsavel_erro_papel || registro.responsavel_erro_nome) && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-foreground">
                    {registro.responsavel_erro_papel}
                    {registro.responsavel_erro_nome ? ` — ${registro.responsavel_erro_nome}` : ""}
                  </span>
                </div>
              )}
              {registro.acabador_responsavel && (
                <div className="text-sm text-muted-foreground">
                  Acabador responsável: <span className="text-foreground">{registro.acabador_responsavel}</span>
                </div>
              )}
            </div>

            {/* Justificativa */}
            {registro.justificativa && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Justificativa</h3>
                  <div className="border-l-2 border-border pl-3 py-1 text-sm text-foreground whitespace-pre-wrap">
                    {registro.justificativa}
                  </div>
                </div>
              </>
            )}

            {/* Peças */}
            {registro.pecas.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Peças ({registro.pecas.length})
                  </h3>
                  <div className="space-y-2">
                    {registro.pecas.map((peca) => (
                      <div key={peca.id} className="p-2.5 rounded-md bg-muted/30 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          {peca.item && <span className="font-medium text-foreground w-6 text-center">{peca.item}</span>}
                          <span className="flex-1 text-foreground">{peca.descricao || "—"}</span>
                          {peca.quantidade && peca.quantidade > 1 && (
                            <span className="text-muted-foreground text-xs">×{peca.quantidade}</span>
                          )}
                          {peca.nao_consta_os && (
                            <span className="text-[10px] text-destructive font-medium">NÃO CONSTA OS</span>
                          )}
                        </div>
                        {(peca.medida_atual || peca.medida_necessaria) && (
                          <div className="flex gap-4 text-xs text-muted-foreground pl-8">
                            {peca.medida_atual && <span>Atual: <span className="text-foreground">{peca.medida_atual}</span></span>}
                            {peca.medida_necessaria && <span>Necessária: <span className="text-foreground">{peca.medida_necessaria}</span></span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Recolha */}
            {registro.requer_recolha && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Recolha
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Origem</span>
                      <p className="text-foreground">{registro.recolha_origem || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Destino</span>
                      <p className="text-foreground">{registro.recolha_destino || "—"}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Projetos */}
            {registro.encaminhar_projetos && (
              <>
                <Separator />
                <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
                  <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Palette className="h-4 w-4" /> Encaminhamento para Projetos
                  </h3>
                  {registro.instrucao_projetos ? (
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {registro.instrucao_projetos}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem instrução específica.</p>
                  )}
                </div>
              </>
            )}

            {/* Evidências */}
            {registro.evidencias.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Evidências ({registro.evidencias.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {registro.evidencias.map((ev) => (
                      <a key={ev.id} href={ev.url_foto} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={ev.url_foto}
                          alt="Evidência"
                          className="w-full h-20 object-cover rounded-md border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <FileText className="h-4 w-4 mr-1" />
                Gerar PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => gerarPDFRegistroCompleto(registro)}>
                PDF Completo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => gerarPDFRegistroProducao(registro)}>
                PDF Produção
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {nextStatuses.map((ns) => (
            <Button
              key={ns}
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={() => handleStatusChange(ns)}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {REGISTRO_STATUS_LABELS[ns]}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
