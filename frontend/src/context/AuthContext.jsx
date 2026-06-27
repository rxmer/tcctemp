import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { authService } from "../services/auth.service";
import { AuthContext } from "./AuthContextStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setUsuario(null);
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      setUser(authUser);
      const data = await authService.me();
      setUsuario(data.usuario ?? null);
      setTenant(data.tenant ?? null);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err.message);
      setUsuario(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async ({ email, senha }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) throw error;

    return data;
  };

  const signOut = async () => {
    setUser(null);
    setUsuario(null);
    setTenant(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signUp = async ({ nomeEmpresa, nome, email, senha }) => {
    return authService.signup({ nomeEmpresa, nome, email, senha });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        tenant,
        loading,
        signIn,
        signOut,
        signUp,
        isAdmin: usuario?.perfil === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
