import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logoNue from "@/assets/logo-nue-v1.svg";

const FUNCOES = [
  "Líder PCP",
  "PCP Expedição",
  "PCP Entrada",
  "PCP Saída",
  "Apoio Operacional",
  "Supervisor Obra",
  "Gerente Produção",
  "Gerente Operações",
  "Projetista",
  "Outro",
];

const BASES = ["Base 1", "Base 2", "Obra", "Gestão"];

export default function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [funcao, setFuncao] = useState("");
  const [base, setBase] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (senha.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não conferem.");
      return;
    }
    if (!funcao || !base) {
      setError("Selecione função e base.");
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/login`;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nome, sobrenome, funcao, base },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Notificar admin via email transacional
    if (data.user) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "novo-cadastro-admin",
            recipientEmail: "julianaguerra@nuesuperficies.com.br",
            idempotencyKey: `novo-cadastro-${data.user.id}`,
            templateData: {
              nome,
              sobrenome,
              email,
              funcao,
              base,
              dataSolicitacao: new Date().toLocaleString("pt-BR"),
            },
          },
        });
      } catch (err) {
        console.error("Erro ao notificar admin:", err);
      }
    }

    // Garantir que sessão automática (caso autoconfirm) seja encerrada — login só após aprovação
    await supabase.auth.signOut();

    toast({
      title: "Cadastro enviado!",
      description:
        "Aguarde aprovação do administrador. Você receberá um email quando for liberado.",
    });
    setLoading(false);
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logoNue} alt="NUE Projetos" className="h-10 w-auto" />
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground text-center mb-1">
            Solicitar acesso
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Sistema PCP — preencha seus dados
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sobrenome">Sobrenome</Label>
                <Input
                  id="sobrenome"
                  value={sobrenome}
                  onChange={(e) => setSobrenome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Select value={funcao} onValueChange={setFuncao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCOES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Base</Label>
                <Select value={base} onValueChange={setBase}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BASES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar solicitação
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Já tem acesso?{" "}
            <Link to="/login" className="underline hover:text-foreground">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
