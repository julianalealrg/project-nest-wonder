import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoNue from "@/assets/logo-nue-v1.svg";
import marmorariaImg from "@/assets/login-marmoraria.jpg";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError, blocked, mustChangePassword } = await signIn(email, password);
    if (blocked) {
      setError(blocked);
    } else if (signInError) {
      setError("Email ou senha incorretos.");
    } else if (mustChangePassword) {
      navigate("/redefinir-senha?first_login=1");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left column — image (hidden on mobile) */}
      <div className="hidden md:block md:w-1/2 relative">
        <img
          src={marmorariaImg}
          alt="Marmoraria NUE Projetos"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/30" />
      </div>

      {/* Right column — form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-10">
            <img src={logoNue} alt="NUE Projetos" className="h-12 w-auto" />
          </div>

          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground text-center mb-1">
              Entrar no sistema
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              PCP — Planejamento e Controle de Produção
            </p>

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

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>

              <div className="flex justify-between text-xs pt-2">
                <Link to="/cadastro" className="text-muted-foreground hover:text-foreground underline">
                  Cadastre-se
                </Link>
                <Link
                  to="/recuperar-senha"
                  className="text-muted-foreground hover:text-foreground underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </form>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            NUE Projetos © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
