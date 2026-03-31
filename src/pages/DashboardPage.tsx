import { AppLayout } from "@/components/AppLayout";

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard">
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Dashboard em construção.</p>
        <p className="text-sm text-muted-foreground mt-1">Indicadores e analytics de produção.</p>
      </div>
    </AppLayout>
  );
}
