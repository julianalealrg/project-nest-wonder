import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import logoNue from "@/assets/logo-nue-v1.svg";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      setError(error.message);
    } else {
      setEnviado(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoNue} alt="NUE Projetos" className="h-10 w-auto" />
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground text-center mb-1">
            Recuperar senha
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enviaremos um link para seu email
          </p>

          {enviado ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">
                Link de redefinição enviado para <strong>{email}</strong>. Verifique a caixa de entrada.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Voltar para o login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enviar link
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                <Link to="/login" className="underline hover:text-foreground">
                  Voltar ao login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
