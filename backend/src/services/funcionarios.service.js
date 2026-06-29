import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function criarFuncionario({
  nome,
  email,
  senha,
  perfil,
  tenantId,
}) {
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        tenant_id: tenantId,
        perfil: perfil ?? "funcionario",
      },
    });

  if (authError)
    throw new AppError(`Erro ao criar usuário: ${authError.message}`);

  const { error: insertError } = await supabaseAdmin.from("usuarios").upsert({
    id: authData.user.id,
    nome,
    email,
    tenant_id: tenantId,
    perfil: perfil ?? "funcionario",
  });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
    throw new AppError(`Erro ao salvar funcionário: ${insertError.message}`);
  }

  return { id: authData.user.id, nome, email, perfil: perfil ?? "funcionario" };
}

export async function listarFuncionarios(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, nome, email, perfil, criado_em")
    .eq("tenant_id", tenantId)
    .neq("perfil", "admin")
    .order("criado_em", { ascending: false });

  if (error)
    throw new AppError(`Erro ao listar funcionários: ${error.message}`);
  return data;
}

export async function atualizarFuncionario(id, { nome, email }) {
  const updates = {};
  if (nome) updates.nome = nome;

  if (email) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
    if (authError) throw new AppError(`Erro ao atualizar e-mail: ${authError.message}`);
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) return { id };

  const { error } = await supabaseAdmin.from("usuarios").update(updates).eq("id", id);
  if (error) throw new AppError(`Erro ao atualizar funcionário: ${error.message}`);

  return { id, ...updates };
}

export async function deletarFuncionario(id) {
  const { error: deleteError } = await supabaseAdmin.from("usuarios").delete().eq("id", id);
  if (deleteError) throw new AppError(`Erro ao excluir funcionário: ${deleteError.message}`);

  await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {});
  return { id };
}
