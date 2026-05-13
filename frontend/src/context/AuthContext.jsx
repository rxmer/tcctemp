import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContextStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    // Sem usuário autenticado
    if (!authUser) {
      setUser(null);
      setUsuario(null);
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      setUser(authUser);

      // Busca usuário da tabela public.usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;

      setUsuario(usuarioData ?? null);

      // Busca tenant somente se existir usuário
      if (usuarioData?.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", usuarioData.tenant_id)
          .maybeSingle();

        if (tenantError) throw tenantError;

        setTenant(tenantData ?? null);
      } else {
        setTenant(null);
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err.message);
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
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  };

  const signUp = async ({ nomeEmpresa, nome, email, senha }) => {
    const slug = `${nomeEmpresa
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now()}`;

    // Cria tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        nome: nomeEmpresa,
        slug,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Cria usuário auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          tenant_id: tenantData.id,
          perfil: "admin",
        },
      },
    });

    // Rollback se falhar
    if (authError) {
      await supabase.from("tenants").delete().eq("id", tenantData.id);
      throw authError;
    }

    return {
      tenant: tenantData,
      user: authData.user,
    };
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
