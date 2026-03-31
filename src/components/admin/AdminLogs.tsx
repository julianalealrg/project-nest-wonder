import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("todos");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const q = search.toLowerCase();
      if (q && !(l.user_name || "").toLowerCase().includes(q) && !(l.entity_description || "").toLowerCase().includes(q)) return false;
      if (actionFilter !== "todos" && l.action !== actionFilter) return false;
      return true;
    });
  }, [logs, search, actionFilter]);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Buscar por usuário ou entidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9 bg-card" />
        <div className="space-y-1">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px] h-9 bg-card"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as ações</SelectItem>
              {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "dd/MM/yy HH:mm")}</TableCell>
                  <TableCell className="text-sm">{l.user_name || "Sistema"}</TableCell>
                  <TableCell className="text-sm">{l.action}</TableCell>
                  <TableCell className="text-sm">{l.entity_description || l.entity_type || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {l.details ? JSON.stringify(l.details) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum log encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
