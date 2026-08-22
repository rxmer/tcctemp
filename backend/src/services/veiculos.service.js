import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { dataLocalISO } from "../utils/data.js";

export async function criarVeiculo({ placa, marca, modelo, ano, cor, cliente_id, tenantId }) {
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("cliente_id")
    .eq("cliente_id", cliente_id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .maybeSingle();

  if (!cliente) {
    throw new AppError("Cliente não encontrado para este vínculo", 404);
  }

  const { data: existing } = await supabaseAdmin
    .from("veiculos")
    .select("veiculo_id")
    .eq("placa", placa.toUpperCase())
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
    const s = search.replace(/[,%()\\;]/g, "").trim().slice(0, 100);
    if (s) {
      query = query.or(`placa.ilike.%${s}%,marca.ilike.%${s}%,modelo.ilike.%${s}%`);
    }
  }

  const { data, error, count } = await query
    .order("veiculo_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar veículos: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarVeiculo(id, tenantId, updates) {
  if (updates.placa) {
    updates.placa = updates.placa.toUpperCase();
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
  const hoje = dataLocalISO();

  const { count: agFuturos } = await supabaseAdmin
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("veiculo_id", id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .gte("data_agendamento", hoje)
    .in("status", ["pendente", "confirmado", "em_andamento"]);

  if (agFuturos > 0) {
    throw new AppError("Não é possível excluir um veículo com agendamentos futuros", 400);
  }

  const { error } = await supabaseAdmin
    .from("veiculos")
    .update({ deletado_em: new Date().toISOString() })
    .eq("veiculo_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar veículo: ${error.message}`);
}
