import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { AdminRelatorios } from "@/components/admin/AdminRelatorios";
import { AdminUsuarios } from "@/components/admin/AdminUsuarios";
import { AdminLogs } from "@/components/admin/AdminLogs";
import { AdminListas } from "@/components/admin/AdminListas";
import { AdminUltimoUso } from "@/components/admin/AdminUltimoUso";

export default function AdminPage() {
  const { profile } = useAuth();

  if (profile?.perfil !== "admin") {
    return (
      <AppLayout title="Admin">
        <div className="bg-card rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin">
      <Tabs defaultValue="relatorios" className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="logs">Log de Atividade</TabsTrigger>
          <TabsTrigger value="listas">Listas do Sistema</TabsTrigger>
          <TabsTrigger value="ultimo-uso">Último Uso</TabsTrigger>
        </TabsList>

        <TabsContent value="relatorios"><AdminRelatorios /></TabsContent>
        <TabsContent value="usuarios"><AdminUsuarios /></TabsContent>
        <TabsContent value="logs"><AdminLogs /></TabsContent>
        <TabsContent value="listas"><AdminListas /></TabsContent>
        <TabsContent value="ultimo-uso"><AdminUltimoUso /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}
