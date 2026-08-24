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

export async function atualizarFuncionario(id, { nome, email }, tenantId) {
  await garantirFuncionarioDoTenant(id, tenantId);

  const updates = {};
  if (nome) updates.nome = nome;

  if (email) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
    if (authError) throw new AppError(`Erro ao atualizar e-mail: ${authError.message}`);
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) return { id };

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new AppError(`Erro ao atualizar funcionário: ${error.message}`);

  return { id, ...updates };
}

async function garantirFuncionarioDoTenant(id, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, perfil")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) throw new AppError("Funcionário não encontrado", 404);
  if (data.perfil === "admin") {
    throw new AppError("Não é possível gerenciar uma conta de administrador", 403);
  }
}

export async function redefinirSenha(id, senha, tenantId) {
  await garantirFuncionarioDoTenant(id, tenantId);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: senha,
  });

  if (error) throw new AppError(`Erro ao redefinir senha: ${error.message}`);
  return { id };
}

export async function deletarFuncionario(id, tenantId, solicitanteId) {
  if (id === solicitanteId) {
    throw new AppError("Não é possível excluir a sua própria conta", 400);
  }

  await garantirFuncionarioDoTenant(id, tenantId);

  const { error: deleteError } = await supabaseAdmin
    .from("usuarios")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (deleteError) throw new AppError(`Erro ao excluir funcionário: ${deleteError.message}`);

  await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {});
  return { id };
}
