import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function criarVeiculo({ placa, marca, modelo, ano, cor, cliente_id, tenantId }) {
  const { data: existing } = await supabaseAdmin
    .from("veiculos")
    .select("veiculo_id")
    .eq("placa", placa)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .maybeSingle();

  if (existing) {
    throw new AppError("Já existe um veículo com esta placa", 409);
  }

  const { data, error } = await supabaseAdmin
    .from("veiculos")
    .insert({
      placa: placa.toUpperCase(),
      marca,
      modelo,
      ano,
      cor,
      cliente_id,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar veículo: ${error.message}`);
  return data;
}

export async function listarVeiculos(tenantId, { page = 1, limit = 20, search = "" } = {}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("veiculos")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (search) {
    query = query.or(`placa.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("veiculo_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar veículos: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarVeiculo(id, tenantId, updates) {
  if (updates.placa) {
    const { data: existing } = await supabaseAdmin
      .from("veiculos")
      .select("veiculo_id")
      .eq("placa", updates.placa)
      .eq("tenant_id", tenantId)
      .is("deletado_em", null)
      .neq("veiculo_id", id)
      .maybeSingle();

    if (existing) {
      throw new AppError("Já existe outro veículo com esta placa", 409);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("veiculos")
    .update(updates)
    .eq("veiculo_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar veículo: ${error.message}`);
  return data;
}

export async function deletarVeiculo(id, tenantId) {
  const { error } = await supabaseAdmin
    .from("veiculos")
    .update({ deletado_em: new Date().toISOString() })
    .eq("veiculo_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar veículo: ${error.message}`);
}
