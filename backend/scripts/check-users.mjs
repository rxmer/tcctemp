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

const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "n/a";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}${"*".repeat(Math.max(3, user.length - 2))}@${domain}`;
};

const maskNome = (nome) => {
  if (!nome) return "n/a";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return `${partes[0].slice(0, 1)}${"*".repeat(Math.max(2, partes[0].length - 1))}`;
  return `${partes[0].slice(0, 1)}${"*".repeat(3)} ${partes[partes.length - 1].slice(0, 1)}${"*".repeat(3)}`;
};

if (data.length === 0) {
  console.log("Nenhum usuário encontrado na tabela usuarios.");
} else {
  data.forEach((u) =>
    console.log(
      `${maskEmail(u.email)} | nome: ${maskNome(u.nome)} | perfil: ${u.perfil} | tenant: ${u.tenant_id?.slice(0, 8) || "N/A"}...`
    )
  );
  console.log(`\nTotal: ${data.length} usuário(s)`);
}
