import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function criarCliente({ nome, telefone, email, tenantId }) {
  if (telefone) {
    const { data: existing } = await supabaseAdmin
      .from("clientes")
      .select("cliente_id")
      .eq("telefone", telefone)
      .eq("tenant_id", tenantId)
      .is("deletado_em", null)
      .maybeSingle();

    if (existing) {
      throw new AppError("Já existe um cliente com este telefone", 409);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({ nome, telefone, email, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar cliente: ${error.message}`);
  return data;
}

export async function listarClientes(tenantId, { page = 1, limit = 20, search = "" } = {}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("clientes")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (search) {
    query = query.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("cliente_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar clientes: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarCliente(id, tenantId, updates) {
  if (updates.telefone) {
    const { data: existing } = await supabaseAdmin
      .from("clientes")
      .select("cliente_id")
      .eq("telefone", updates.telefone)
      .eq("tenant_id", tenantId)
      .is("deletado_em", null)
      .neq("cliente_id", id)
      .maybeSingle();

    if (existing) {
      throw new AppError("Já existe outro cliente com este telefone", 409);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update(updates)
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar cliente: ${error.message}`);
  return data;
}

export async function deletarCliente(id, tenantId) {
  const { error } = await supabaseAdmin
    .from("clientes")
    .update({ deletado_em: new Date().toISOString() })
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar cliente: ${error.message}`);
}
