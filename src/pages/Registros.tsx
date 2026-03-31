import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Registros() {
  return (
    <AppLayout
      title="Registros"
      action={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Registro</Button>}
    >
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Módulo de registros em construção.</p>
        <p className="text-sm text-muted-foreground mt-1">Ocorrências de obra/fábrica e solicitações de reposição.</p>
      </div>
    </AppLayout>
  );
}
