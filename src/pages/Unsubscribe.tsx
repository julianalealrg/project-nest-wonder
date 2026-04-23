import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import logoNue from "@/assets/logo-nue-v1.svg";

const SUPABASE_URL = "https://idbgzmlpmsyoegjfzzpa.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkYmd6bWxwbXN5b2VnamZ6enBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODE1NzIsImV4cCI6MjA5MDU1NzU3Mn0.AKzKC6pnRnr7G1HlH9VJln8yRxHki1Spw3Y5U_eHDt8";

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  async function confirm() {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setState("done");
      else {
        setErrorMsg(data.reason ?? "Erro ao processar.");
        setState("error");
      }
    } catch {
      setState("error");
      setErrorMsg("Erro de conexão.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoNue} alt="NUE Projetos" className="h-10 w-auto" />
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm text-center">
          {state === "loading" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Validando link...</p>
            </>
          )}
          {state === "valid" && (
            <>
              <h2 className="text-lg font-semibold mb-2">Cancelar inscrição</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Você não receberá mais emails do Sistema PCP NUE.
              </p>
              <Button onClick={confirm} className="w-full">
                Confirmar cancelamento
              </Button>
            </>
          )}
          {state === "submitting" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processando...</p>
            </>
          )}
          {state === "done" && (
            <>
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-foreground" />
              <h2 className="text-lg font-semibold mb-2">Inscrição cancelada</h2>
              <p className="text-sm text-muted-foreground">
                Você não receberá mais emails deste tipo.
              </p>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-foreground" />
              <h2 className="text-lg font-semibold mb-2">Já cancelado</h2>
              <p className="text-sm text-muted-foreground">
                Esta inscrição já havia sido cancelada anteriormente.
              </p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Link inválido</h2>
              <p className="text-sm text-muted-foreground">
                {errorMsg || "Este link de cancelamento é inválido ou expirou."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
