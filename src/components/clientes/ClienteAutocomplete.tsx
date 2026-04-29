import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { useClientes, type ClienteComResumo } from "@/hooks/useClientes";
import { compararNomes, normalizeNome } from "@/lib/clienteSimilarity";

interface ClienteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (cliente: ClienteComResumo | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClienteAutocomplete({
  value,
  onChange,
  selectedId,
  onSelect,
  placeholder = "Nome do cliente",
  disabled,
}: ClienteAutocompleteProps) {
  const { data: clientes = [], isLoading } = useClientes();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sugestoes = useMemo(() => {
    if (selectedId) return [];
    const q = normalizeNome(value);
    if (!q || q.length < 2) return [];
    const matches = clientes
      .map((c) => ({ cliente: c, sim: compararNomes(value, c.nome) }))
      .filter(({ cliente, sim }) => {
        const nc = normalizeNome(cliente.nome);
        return sim.match || nc.includes(q) || q.includes(nc);
      })
      .slice(0, 8);
    return matches;
  }, [value, clientes, selectedId]);

  const aviso = useMemo(() => {
    if (selectedId || !value.trim()) return null;
    const exatos = sugestoes.filter((s) => s.sim.exato);
    if (exatos.length > 0) {
      return {
        tipo: "exato" as const,
        cliente: exatos[0].cliente,
      };
    }
    const similares = sugestoes.filter((s) => s.sim.match && !s.sim.exato);
    if (similares.length > 0) {
      return {
        tipo: "similar" as const,
        cliente: similares[0].cliente,
      };
    }
    return null;
  }, [sugestoes, selectedId, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(cliente: ClienteComResumo) {
    onSelect(cliente);
    setOpen(false);
  }

  function handleClear() {
    onSelect(null);
    onChange("");
  }

  if (selectedId) {
    const sel = clientes.find((c) => c.id === selectedId);
    return (
      <div className="flex items-center gap-2 border rounded-md bg-nue-verde/10 px-3 py-2">
        <Check className="h-4 w-4 text-nue-verde flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground truncate">
            {sel?.nome || value}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Cliente existente · {sel?.total_os ?? 0} OS vinculada{(sel?.total_os ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Remover seleção"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-1">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {open && sugestoes.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {sugestoes.map(({ cliente, sim }) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => handleSelect(cliente)}
              className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b last:border-b-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {cliente.nome}
                </span>
                {sim.exato ? (
                  <span className="text-[10px] uppercase font-semibold bg-nue-verde text-white px-1.5 py-0.5 rounded flex-shrink-0">
                    Exato
                  </span>
                ) : sim.match ? (
                  <span className="text-[10px] uppercase font-semibold bg-nue-amarelo text-nue-chumbo px-1.5 py-0.5 rounded flex-shrink-0">
                    Parecido
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {cliente.total_os} OS · {cliente.supervisor || "sem supervisor"}
              </div>
            </button>
          ))}
        </div>
      )}

      {!open && aviso && (
        <div
          className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${
            aviso.tipo === "exato"
              ? "bg-nue-verde/10 text-nue-verde"
              : "bg-nue-amarelo/15 text-nue-chumbo"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div>
            {aviso.tipo === "exato" ? (
              <>
                Já existe cliente com esse nome:{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => handleSelect(aviso.cliente)}
                >
                  {aviso.cliente.nome}
                </button>{" "}
                — clique pra usar o existente.
              </>
            ) : (
              <>
                Nome parecido com{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => handleSelect(aviso.cliente)}
                >
                  {aviso.cliente.nome}
                </button>{" "}
                — confirme se não é o mesmo cliente antes de criar novo.
              </>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> carregando clientes...
        </div>
      )}
    </div>
  );
}
