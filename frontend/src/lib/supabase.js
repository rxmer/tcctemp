
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.\n" +
      "Crie o arquivo frontend/.env com suas credenciais do Supabase.",
  );
}

const sessionStorageAdapter = {
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: (key) => window.sessionStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: sessionStorageAdapter,
    storageKey: "esteticar-auth",
    flowType: "implicit",
  },
});
