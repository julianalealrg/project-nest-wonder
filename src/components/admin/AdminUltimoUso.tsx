import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminUltimoUso() {
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles-uso"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: lastActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["admin-last-actions"],
    queryFn: async () => {
      // Get last action per user
      const { data, error } = await supabase
        .from("activity_logs")
        .select("user_id, user_name, action, entity_description, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const perUser = new Map<string, any>();
      (data || []).forEach((l) => {
        if (l.user_id && !perUser.has(l.user_id)) {
          perUser.set(l.user_id, l);
        }
      });
      return Array.from(perUser.values());
    },
  });

  const isLoading = loadingProfiles || loadingActions;

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  const actionMap = new Map(lastActions.map((a: any) => [a.user_id, a]));

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operador</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Última Ação</TableHead>
              <TableHead>Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p: any) => {
              const lastAct = actionMap.get(p.user_id) as any;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.base}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{p.perfil}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.ultimo_acesso ? format(new Date(p.ultimo_acesso), "dd/MM/yy HH:mm") : "Nunca"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lastAct ? `${lastAct.action} — ${lastAct.entity_description || ""}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lastAct ? format(new Date(lastAct.created_at), "dd/MM/yy HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
