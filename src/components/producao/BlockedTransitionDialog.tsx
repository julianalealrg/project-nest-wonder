import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BlockedTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  reason: string;
  details?: string[];
}

export function BlockedTransitionDialog({
  open,
  onOpenChange,
  title,
  reason,
  details,
}: BlockedTransitionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-foreground">{reason}</p>
          {details && details.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Pendências
              </p>
              <ScrollArea className="max-h-[200px]">
                <ul className="space-y-1 text-[13px] text-foreground">
                  {details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
