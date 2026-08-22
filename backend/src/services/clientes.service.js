import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { dataLocalISO } from "../utils/data.js";

export async function criarCliente({ nome, telefone, email, tenantId }) {
  if (telefone) {
    telefone = telefone.replace(/\D/g, "").replace(/^55/, "");
    if (telefone.length < 10 || telefone.length > 11) {
      throw new AppError("Telefone deve conter 10 ou 11 dígitos", 400);
    }
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
    const s = search.replace(/[,%()\\;]/g, "").trim().slice(0, 100);
    if (s) {
      query = query.or(`nome.ilike.%${s}%,telefone.ilike.%${s}%,email.ilike.%${s}%`);
    }
  }

  const { data, error, count } = await query
    .order("cliente_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar clientes: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarCliente(id, tenantId, updates) {
  if (updates.telefone) {
    updates.telefone = updates.telefone.replace(/\D/g, "").replace(/^55/, "");
    if (updates.telefone.length < 10 || updates.telefone.length > 11) {
      throw new AppError("Telefone deve conter 10 ou 11 dígitos", 400);
    }
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
  const hoje = dataLocalISO();

  const { data: cliente, error: fetchError } = await supabaseAdmin
    .from("clientes")
    .select("cliente_id")
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .maybeSingle();

  if (fetchError) throw new AppError(`Erro ao buscar cliente: ${fetchError.message}`);
  if (!cliente) throw new AppError("Cliente não encontrado", 404);

  const { count: agFuturos, error: agErr } = await supabaseAdmin
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .gte("data_agendamento", hoje)
    .in("status", ["pendente", "confirmado", "em_andamento"]);

  if (agErr) throw new AppError(`Erro ao verificar agendamentos: ${agErr.message}`);
  if (agFuturos > 0) {
    throw new AppError("Não é possível excluir um cliente com agendamentos futuros", 400);
  }

  const { data: ags } = await supabaseAdmin
    .from("agendamentos")
    .select("agendamento_id")
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId);

  const agIds = (ags ?? []).map((a) => a.agendamento_id);

  if (agIds.length > 0) {
    const { count: osAndamento, error: osErr } = await supabaseAdmin
      .from("ordens_servico")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deletado_em", null)
      .eq("status", "em_andamento")
      .in("agendamento_id", agIds);

    if (osErr) throw new AppError(`Erro ao verificar ordens de serviço: ${osErr.message}`);
    if (osAndamento > 0) {
      throw new AppError("Não é possível excluir um cliente com ordem de serviço em andamento", 400);
    }
  }

  const agora = new Date().toISOString();

  const { error: errorVeiculos } = await supabaseAdmin
    .from("veiculos")
    .update({ deletado_em: agora })
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (errorVeiculos) throw new AppError(`Erro ao deletar veículos do cliente: ${errorVeiculos.message}`);

  const { error } = await supabaseAdmin
    .from("clientes")
    .update({ deletado_em: agora })
    .eq("cliente_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar cliente: ${error.message}`);
}
