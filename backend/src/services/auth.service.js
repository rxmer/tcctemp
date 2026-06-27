import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function signup({ nomeEmpresa, nome, email, senha }) {
  const slug = `${nomeEmpresa
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${randomUUID().slice(0, 8)}`;

  const { data: tenantData, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({ nome: nomeEmpresa, slug })
    .select()
    .single();

  if (tenantError) throw new AppError(`Erro ao criar tenant: ${tenantError.message}`);

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome,
      tenant_id: tenantData.id,
      perfil: "admin",
    },
  });

  if (authError) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenantData.id);
    throw new AppError(`Erro ao criar usuário: ${authError.message}`);
  }

  const { error: insertError } = await supabaseAdmin
    .from("usuarios")
    .upsert({
      id: authData.user.id,
      nome,
      email,
      tenant_id: tenantData.id,
      perfil: "admin",
    });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
    await supabaseAdmin.from("tenants").delete().eq("id", tenantData.id);
    throw new AppError(`Erro ao salvar perfil: ${insertError.message}`);
  }

  return {
    id: authData.user.id,
    email: authData.user.email,
    tenant: tenantData,
  };
}

export async function getProfile(userId) {
  const { data: usuarioData, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (usuarioError) throw new AppError(`Erro ao buscar perfil: ${usuarioError.message}`);

  let tenantData = null;
  if (usuarioData?.tenant_id) {
    const { data, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", usuarioData.tenant_id)
      .maybeSingle();

    if (tenantError) throw new AppError(`Erro ao buscar tenant: ${tenantError.message}`);
    tenantData = data;
  }

  return {
    usuario: usuarioData ?? null,
    tenant: tenantData,
  };
}
