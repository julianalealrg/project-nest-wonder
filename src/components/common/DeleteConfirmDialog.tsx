import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título destrutivo, ex: "Excluir Romaneio ROM-B1B2-26-001?" */
  title: string;
  /** Texto descritivo do que vai acontecer (já dentro de um bloco) */
  description: React.ReactNode;
  /** Texto exato que o usuário precisa digitar pra liberar o botão (ex: o código) */
  confirmText: string;
  /** Loading enquanto deleta */
  loading: boolean;
  /** Handler async de exclusão */
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  loading,
  onConfirm,
  confirmLabel = "Excluir definitivamente",
}: DeleteConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {description}
              <div className="text-sm">
                Pra confirmar, digite{" "}
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                  {confirmText}
                </code>{" "}
                abaixo:
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmText}
          disabled={loading}
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
            disabled={loading || typed.trim() !== confirmText}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
