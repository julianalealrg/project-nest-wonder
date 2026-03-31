import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Producao() {
  return (
    <AppLayout
      title="Produção"
      action={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova OS</Button>}
    >
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Módulo de produção em construção.</p>
        <p className="text-sm text-muted-foreground mt-1">Cadastro de OS, rastreio de peças e estações de produção.</p>
      </div>
    </AppLayout>
  );
}
