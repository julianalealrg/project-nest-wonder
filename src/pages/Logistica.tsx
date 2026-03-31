import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Logistica() {
  return (
    <AppLayout
      title="Logística"
      action={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Romaneio</Button>}
    >
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Módulo de logística em construção.</p>
        <p className="text-sm text-muted-foreground mt-1">Romaneios, expedições, conferências e entregas.</p>
      </div>
    </AppLayout>
  );
}
