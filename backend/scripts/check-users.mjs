import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabaseAdmin.from("usuarios").select("id, nome, email, perfil, tenant_id");

if (error) {
  console.error("ERRO:", error);
  process.exit(1);
}

if (data.length === 0) {
  console.log("Nenhum usuário encontrado na tabela usuarios.");
} else {
  data.forEach((u) =>
    console.log(`${u.email} | nome: ${u.nome} | perfil: ${u.perfil} | tenant: ${u.tenant_id?.slice(0, 8) || "N/A"}...`)
  );
  console.log(`\nTotal: ${data.length} usuário(s)`);
}
