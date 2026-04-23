import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  base: string;
  funcao: string;
  perfil: "admin" | "operador" | "observador";
  status_aprovacao?: string;
  deve_trocar_senha?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; blocked?: string; mustChangePassword?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);

    // Atualizar ultimo_acesso
    if (data) {
      await supabase
        .from("profiles")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("user_id", userId);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("status_aprovacao, deve_trocar_senha")
        .eq("user_id", data.user.id)
        .single();

      if (prof?.status_aprovacao === "pendente") {
        await supabase.auth.signOut();
        return {
          error: null,
          blocked:
            "Seu cadastro ainda não foi aprovado pelo administrador. Aguarde ou entre em contato.",
        };
      }
      if (prof?.status_aprovacao === "rejeitado") {
        await supabase.auth.signOut();
        return {
          error: null,
          blocked: "Seu cadastro não foi aprovado. Entre em contato com o administrador.",
        };
      }
      if ((prof as any)?.deve_trocar_senha) {
        return { error: null, mustChangePassword: true };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

