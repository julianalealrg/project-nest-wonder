import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  sobrenome: string | null;
  email: string;
  base: string;
  funcao: string | null;
  perfil: string;
  status_aprovacao: string;
  ultimo_acesso: string | null;
}

const STATUS_VARIANT: Record<string, { label: string; className: string }> = {
  aprovado: { label: "Aprovado", className: "bg-foreground/10 text-foreground" },
  pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-900 border-yellow-300" },
  rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-900 border-red-300" },
};

export function AdminUsuarios() {
  const queryClient = useQueryClient();
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filtered = profiles.filter((p) =>
    filtro === "todos" ? true : p.status_aprovacao === filtro
  );

  async function aprovar(p: Profile) {
    setActionLoading(p.id);
    const { error } = await supabase
      .from("profiles")
      .update({ status_aprovacao: "aprovado" })
      .eq("id", p.id);

    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "cadastro-aprovado",
            recipientEmail: p.email,
            idempotencyKey: `aprovado-${p.user_id}`,
            templateData: { nome: p.nome },
          },
        });
      } catch (e) {
        console.error("Email aprovação:", e);
      }
      toast({ title: `${p.nome} aprovado(a)` });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
    setActionLoading(null);
  }

  async function rejeitar(p: Profile) {
    setActionLoading(p.id);
    const { error } = await supabase
      .from("profiles")
      .update({ status_aprovacao: "rejeitado" })
      .eq("id", p.id);

    if (error) {
      toast({ title: "Erro ao rejeitar", description: error.message, variant: "destructive" });
    } else {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "cadastro-rejeitado",
            recipientEmail: p.email,
            idempotencyKey: `rejeitado-${p.user_id}`,
            templateData: { nome: p.nome },
          },
        });
      } catch (e) {
        console.error("Email rejeição:", e);
      }
      toast({ title: `${p.nome} rejeitado(a)` });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
    setActionLoading(null);
  }

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setNovoOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const st = STATUS_VARIANT[p.status_aprovacao] || STATUS_VARIANT.aprovado;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.nome} {p.sobrenome ?? ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                    <TableCell>{p.base}</TableCell>
                    <TableCell>{p.funcao || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.perfil === "admin" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {p.perfil}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${st.className}`}>
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.ultimo_acesso
                        ? format(new Date(p.ultimo_acesso), "dd/MM/yy HH:mm")
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {p.status_aprovacao === "pendente" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => aprovar(p)}
                              disabled={actionLoading === p.id}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => rejeitar(p)}
                              disabled={actionLoading === p.id}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Rejeitar
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditProfile(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editProfile && (
        <EditUserDialog
          profile={editProfile}
          onClose={() => setEditProfile(null)}
          onSaved={() => {
            setEditProfile(null);
            queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
          }}
        />
      )}

      {novoOpen && (
        <NovoUserDialog
          onClose={() => setNovoOpen(false)}
          onSaved={() => {
            setNovoOpen(false);
            queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
          }}
        />
      )}
    </div>
  );
}

function EditUserDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [base, setBase] = useState(profile.base);
  const [funcao, setFuncao] = useState(profile.funcao || "");
  const [perfil, setPerfil] = useState(profile.perfil);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome, base, funcao: funcao || null, perfil: perfil as any })
      .eq("id", profile.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      if (perfil !== profile.perfil) {
        await supabase.from("user_roles").delete().eq("user_id", profile.user_id);
        await supabase.from("user_roles").insert({ user_id: profile.user_id, role: perfil as any });
      }
      toast({ title: "Usuário atualizado" });
      onSaved();
    }
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Base</Label>
            <Select value={base} onValueChange={setBase}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Base 1">Base 1</SelectItem>
                <SelectItem value="Base 2">Base 2</SelectItem>
                <SelectItem value="Obra">Obra</SelectItem>
                <SelectItem value="Gestão">Gestão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Função</Label>
            <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} />
          </div>
          <div>
            <Label>Perfil</Label>
            <Select value={perfil} onValueChange={setPerfil}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="observador">Observador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoUserDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [base, setBase] = useState("Gestão");
  const [funcao, setFuncao] = useState("");
  const [perfil, setPerfil] = useState("operador");
  const [senhaInicial, setSenhaInicial] = useState("Nue@2026!");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!email || !nome) return;
    const senha = senhaInicial.trim() || "Nue@2026!";
    setSaving(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, status_aprovacao: "aprovado" } },
    });

    if (error) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          base,
          funcao: funcao || null,
          perfil: perfil as any,
          status_aprovacao: "aprovado",
          deve_trocar_senha: true,
        } as any)
        .eq("user_id", data.user.id);
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: perfil as any });
    }

    toast({
      title: `Usuário ${nome} criado`,
      description: `Senha inicial: ${senha}. Informe ao usuário que deve trocá-la no primeiro acesso usando "Esqueceu a senha?".`,
      duration: 12000,
    });
    onSaved();
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Base</Label>
            <Select value={base} onValueChange={setBase}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Base 1">Base 1</SelectItem>
                <SelectItem value="Base 2">Base 2</SelectItem>
                <SelectItem value="Obra">Obra</SelectItem>
                <SelectItem value="Gestão">Gestão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Função</Label>
            <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} />
          </div>
          <div>
            <Label>Perfil</Label>
            <Select value={perfil} onValueChange={setPerfil}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="observador">Observador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Senha inicial</Label>
            <Input
              value={senhaInicial}
              onChange={(e) => setSenhaInicial(e.target.value)}
              placeholder="Nue@2026!"
            />
            <p className="text-xs text-muted-foreground mt-1">
              O usuário será obrigado a redefinir no primeiro acesso.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || !email || !nome} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Criar Usuário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
