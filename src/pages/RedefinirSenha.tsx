import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logoNue from "@/assets/logo-nue-v1.svg";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase entrega sessão de recovery via hash; aguarda processamento
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    toast({ title: "Senha redefinida com sucesso!" });
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoNue} alt="NUE Projetos" className="h-10 w-auto" />
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground text-center mb-1">
            Redefinir senha
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Escolha uma nova senha
          </p>

          {!ready ? (
            <div className="text-sm text-center text-muted-foreground py-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Validando link...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar nova senha
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
