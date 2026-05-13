// src/lib/supabase.js
//
// MUDANÇAS vs versão anterior:
// 1. Adicionado storageKey customizado.
//    Sem isso, múltiplas apps Supabase no mesmo domínio (comum em dev local
//    com localhost) compartilham a mesma chave "supabase.auth.token" no
//    localStorage, causando conflitos de sessão entre projetos.
// 2. flowType: "pkce" — mais seguro que o implicit flow padrão para SPAs.
//    Evita token leakage via URL fragment e é o padrão recomendado pela Supabase.

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
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Isola o localStorage desta app — importante se você rodar múltiplos
    // projetos Supabase no mesmo domínio/porta durante desenvolvimento
    storageKey: "esteticar-auth",
    // PKCE é mais seguro para SPAs: sem token na URL, sem leakage via referrer
    flowType: "pkce",
  },
});
