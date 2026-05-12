import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.\n" +
      "Crie o arquivo frontend/.env com suas credenciais do Supabase.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persiste sessão no localStorage automaticamente
    persistSession: true,
    // Atualiza token automaticamente antes de expirar
    autoRefreshToken: true,
    // Detecta mudanças de sessão em outras abas
    detectSessionInUrl: true,
  },
});
