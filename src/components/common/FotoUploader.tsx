import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FotoUploaderProps {
  /** Arquivos selecionados (ainda não enviados). */
  fotos: File[];
  onChange: (fotos: File[]) => void;
  /** URLs já salvas (ex: edição). Mostra ao lado das novas. */
  fotosSalvas?: string[];
  onRemoverSalva?: (url: string) => void;
  /** Default true: permite múltiplas. */
  multiple?: boolean;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function FotoUploader({
  fotos,
  onChange,
  fotosSalvas = [],
  onRemoverSalva,
  multiple = true,
  label = "Adicionar fotos",
  size = "md",
  disabled,
}: FotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onChange(multiple ? [...fotos, ...files] : files.slice(0, 1));
    e.target.value = "";
  };

  const removerNova = (idx: number) => {
    onChange(fotos.filter((_, i) => i !== idx));
  };

  const thumbCls = size === "sm" ? "h-14 w-14" : "h-20 w-20";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {fotosSalvas.map((url) => (
          <div key={url} className={`relative ${thumbCls} rounded border overflow-hidden bg-muted`}>
            <img src={url} alt="" className="object-cover w-full h-full" />
            {onRemoverSalva && !disabled && (
              <button
                type="button"
                onClick={() => onRemoverSalva(url)}
                className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5 hover:bg-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {fotos.map((f, i) => (
          <div key={i} className={`relative ${thumbCls} rounded border overflow-hidden bg-muted`}>
            <img src={URL.createObjectURL(f)} alt={f.name} className="object-cover w-full h-full" />
            {!disabled && (
              <button
                type="button"
                onClick={() => removerNova(i)}
                className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5 hover:bg-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={`${thumbCls} rounded border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 disabled:opacity-50`}
        >
          <Camera className="h-4 w-4" />
          <span className="text-[10px] leading-none text-center px-1">{label}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={handlePick}
      />
    </div>
  );
}
