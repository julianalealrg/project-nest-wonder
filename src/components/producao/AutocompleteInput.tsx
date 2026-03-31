import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onCreateNew?: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  onCreateNew,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(inputValue.toLowerCase())
  );
  const exactMatch = options.some(
    (o) => o.toLowerCase() === inputValue.toLowerCase()
  );

  return (
    <div ref={ref} className="relative">
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {open && (filtered.length > 0 || (inputValue.trim() && !exactMatch)) && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                onChange(opt);
                setInputValue(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
          {inputValue.trim() && !exactMatch && onCreateNew && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-1 text-primary"
              onClick={() => {
                onCreateNew(inputValue.trim());
                onChange(inputValue.trim());
                setOpen(false);
              }}
            >
              <Plus className="h-3 w-3" />
              Criar "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
