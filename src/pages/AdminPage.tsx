import { AppLayout } from "@/components/AppLayout";

export default function AdminPage() {
  return (
    <AppLayout title="Admin">
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Painel administrativo em construção.</p>
        <p className="text-sm text-muted-foreground mt-1">Relatórios, usuários, logs e listas do sistema.</p>
      </div>
    </AppLayout>
  );
}
