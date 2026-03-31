import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SystemItem {
  id: string;
  tipo: string;
  valor: string;
}

export function AdminListas() {
  const queryClient = useQueryClient();
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<SystemItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["system-lists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_lists").select("*").order("tipo").order("valor");
      if (error) throw error;
      return data as SystemItem[];
    },
  });

  const tipos = useMemo(() => [...new Set(items.map((i) => i.tipo))], [items]);
  const filtered = tipoFilter === "todos" ? items : items.filter((i) => i.tipo === tipoFilter);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("system_lists").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item excluído" });
      queryClient.invalidateQueries({ queryKey: ["system-lists"] });
    }
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["system-lists"] });
  }

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Adicionar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Badge variant="secondary" className="text-xs">{item.tipo}</Badge></TableCell>
                  <TableCell>{item.valor}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditItem(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum item</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {addOpen && <ItemDialog onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); refresh(); }} tipos={tipos} />}
      {editItem && <ItemDialog item={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); refresh(); }} tipos={tipos} />}
    </div>
  );
}

function ItemDialog({ item, onClose, onSaved, tipos }: { item?: SystemItem; onClose: () => void; onSaved: () => void; tipos: string[] }) {
  const [tipo, setTipo] = useState(item?.tipo || "");
  const [novoTipo, setNovoTipo] = useState("");
  const [valor, setValor] = useState(item?.valor || "");
  const [saving, setSaving] = useState(false);

  const finalTipo = tipo === "__novo" ? novoTipo : tipo;

  async function handleSave() {
    if (!finalTipo || !valor) return;
    setSaving(true);

    if (item) {
      const { error } = await supabase.from("system_lists").update({ tipo: finalTipo, valor }).eq("id", item.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Item atualizado" }); onSaved(); }
    } else {
      const { error } = await supabase.from("system_lists").insert({ tipo: finalTipo, valor });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Item adicionado" }); onSaved(); }
    }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{item ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                <SelectItem value="__novo">+ Novo tipo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipo === "__novo" && (
            <div><Label>Nome do tipo</Label><Input value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} /></div>
          )}
          <div><Label>Valor</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <Button onClick={handleSave} disabled={saving || !finalTipo || !valor} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
