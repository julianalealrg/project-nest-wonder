import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Cliente } from "@/hooks/useClientes";

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  onSuccess?: (id: string) => void;
}

const EMPTY_FORM = {
  nome: "",
  cnpj_cpf: "",
  email: "",
  telefone: "",
  contato: "",
  endereco: "",
  supervisor: "",
  arquiteta: "",
  observacoes: "",
};

export function ClienteDialog({ open, onOpenChange, cliente, onSuccess }: ClienteDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!cliente;

  useEffect(() => {
    if (open) {
      if (cliente) {
        setForm({
          nome: cliente.nome || "",
          cnpj_cpf: cliente.cnpj_cpf || "",
          email: cliente.email || "",
          telefone: cliente.telefone || "",
          contato: cliente.contato || "",
          endereco: cliente.endereco || "",
          supervisor: cliente.supervisor || "",
          arquiteta: cliente.arquiteta || "",
          observacoes: cliente.observacoes || "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, cliente]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cnpj_cpf: form.cnpj_cpf.trim() || null,
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        contato: form.contato.trim() || null,
        endereco: form.endereco.trim() || null,
        supervisor: form.supervisor.trim() || null,
        arquiteta: form.arquiteta.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };

      if (isEdit && cliente) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", cliente.id);
        if (error) throw error;
        toast({ title: "Cliente atualizado" });
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
        onSuccess?.(cliente.id);
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast({ title: "Cliente criado" });
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
        if (data?.id) onSuccess?.(data.id);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="Nome completo do cliente ou razão social"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cnpj_cpf">CNPJ / CPF</Label>
              <Input
                id="cnpj_cpf"
                value={form.cnpj_cpf}
                onChange={(e) => update("cnpj_cpf", e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label htmlFor="supervisor">Supervisor NUE</Label>
              <Input
                id="supervisor"
                value={form.supervisor}
                onChange={(e) => update("supervisor", e.target.value)}
                placeholder="Ex: Gino Almeida"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => update("telefone", e.target.value)}
                placeholder="(81) 9 0000-0000"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contato">Outros contatos</Label>
            <Input
              id="contato"
              value={form.contato}
              onChange={(e) => update("contato", e.target.value)}
              placeholder="Nome adicional, ramal, WhatsApp do responsável"
            />
          </div>

          <div>
            <Label htmlFor="endereco">Endereço da obra</Label>
            <Input
              id="endereco"
              value={form.endereco}
              onChange={(e) => update("endereco", e.target.value)}
              placeholder="Rua, número, bairro, cidade/UF"
            />
          </div>

          <div>
            <Label htmlFor="arquiteta">Arquiteta / Projetista da obra</Label>
            <Input
              id="arquiteta"
              value={form.arquiteta}
              onChange={(e) => update("arquiteta", e.target.value)}
              placeholder="Nome da arquiteta responsável"
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => update("observacoes", e.target.value)}
              placeholder="Notas internas sobre o cliente"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar" : "Criar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
