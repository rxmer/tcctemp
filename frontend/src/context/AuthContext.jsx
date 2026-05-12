import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContextStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // auth.users
  const [usuario, setUsuario] = useState(null); // public.usuarios
  const [tenant, setTenant] = useState(null); // public.tenants
  const [loading, setLoading] = useState(true);

  // ── Busca perfil completo do usuário (usuario + tenant) ──
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUsuario(null);
      setTenant(null);
      return;
    }

    try {
      // Busca o registro em public.usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;

      // Evita travar caso o trigger ainda não tenha criado o usuário
      if (!usuarioData) {
        console.warn("Usuário ainda não encontrado em public.usuarios");
        setUsuario(null);
        setTenant(null);
        return;
      }

      setUsuario(usuarioData);

      // Busca o tenant associado
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", usuarioData.tenant_id)
        .maybeSingle();

      if (tenantError) throw tenantError;

      setTenant(tenantData ?? null);
    } catch (err) {
      console.error("Erro ao buscar perfil:", err.message);
    }
  }, []);

  // ── Inicializa sessão ao montar ──
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setUser(session?.user ?? null);

        await fetchProfile(session?.user ?? null);
      } catch (err) {
        console.error("Erro ao iniciar auth:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // Escuta mudanças de sessão (login, logout, refresh de token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      try {
        setLoading(true);

        setUser(session?.user ?? null);

        await fetchProfile(session?.user ?? null);
      } catch (err) {
        console.error("Erro no auth state:", err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ── LOGIN ──────────────────────────────────────────────────
  const signIn = async ({ email, senha }) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;

      const authUser = data?.user ?? data?.session?.user;

      if (authUser) {
        setUser(authUser);
        await fetchProfile(authUser);
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  // ── LOGOUT ────────────────────────────────────────────────
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setUser(null);
    setUsuario(null);
    setTenant(null);
  };

  // ── CADASTRO (novo tenant + admin) ────────────────────────
  const signUp = async ({ nomeEmpresa, nome, email, senha }) => {
    // Passo 1: Cria o tenant
    const slugBase = nomeEmpresa
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const slug = `${slugBase}-${Date.now()}`;

    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert({ nome: nomeEmpresa, slug })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Passo 2: Cria o usuário Auth
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

    if (authError) {
      // Rollback
      await supabase.from("tenants").delete().eq("id", tenantData.id);

      throw authError;
    }

    return {
      tenant: tenantData,
      user: authData.user,
    };
  };

  const value = {
    user,
    usuario,
    tenant,
    loading,
    signIn,
    signOut,
    signUp,
    isAdmin: usuario?.perfil === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
