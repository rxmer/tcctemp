import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { dataLocalISO } from "../utils/data.js";

export async function criarContaPagar({ descricao, valor, data_vencimento, observacoes, tenantId }) {
  if (!descricao || valor == null || !data_vencimento) {
    throw new AppError("Descrição, valor e data de vencimento são obrigatórios", 400);
  }

  const { data, error } = await supabaseAdmin
    .from("contas_pagar")
    .insert({ descricao, valor, data_vencimento, observacoes, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar conta: ${error.message}`);
  return data;
}

export async function listarContasPagar(tenantId, filtros = {}) {
  const page = filtros.page || 1;
  const limit = filtros.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("contas_pagar")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (filtros.data_inicio) query = query.gte("data_vencimento", filtros.data_inicio);
  if (filtros.data_fim) query = query.lte("data_vencimento", filtros.data_fim);
  if (filtros.pago !== undefined) query = query.eq("pago", filtros.pago === "true");

  const { data, error, count } = await query
    .order("data_vencimento", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar contas: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarContaPagar(id, tenantId, updates) {
  const { data, error } = await supabaseAdmin
    .from("contas_pagar")
    .update(updates)
    .eq("conta_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar conta: ${error.message}`);
  return data;
}

export async function buscarContaPagar(id, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("contas_pagar")
    .select("*")
    .eq("conta_id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao buscar conta: ${error.message}`);
  if (!data) throw new AppError("Conta não encontrada", 404);
  return data;
}

export async function buscarFaturamento(id, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("faturamentos")
    .select("*")
    .eq("faturamento_id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao buscar faturamento: ${error.message}`);
  if (!data) throw new AppError("Faturamento não encontrado", 404);
  return data;
}

export async function deletarContaPagar(id, tenantId) {
  const { error } = await supabaseAdmin
    .from("contas_pagar")
    .update({ deletado_em: new Date().toISOString() })
    .eq("conta_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar conta: ${error.message}`);
}

export async function registrarPagamentoFaturamento(id, tenantId, data_pagamento) {
  const { data, error } = await supabaseAdmin
    .from("faturamentos")
    .update({ pago: true, data_pagamento: data_pagamento ?? dataLocalISO() })
    .eq("faturamento_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao registrar pagamento: ${error.message}`);
  return data;
}

export async function listarFaturamentos(tenantId, filtros = {}) {
  const page = filtros.page || 1;
  const limit = filtros.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("faturamentos")
    .select("*, ordem_servico:ordens_servico(agendamento:agendamentos(*))", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (filtros.data_inicio) query = query.gte("criado_em", `${filtros.data_inicio}T00:00:00`);
  if (filtros.data_fim) query = query.lte("criado_em", `${filtros.data_fim}T23:59:59`);
  if (filtros.pago !== undefined) query = query.eq("pago", filtros.pago === "true");

  const { data, error, count } = await query
    .order("criado_em", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar faturamentos: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function resumoFinanceiro(tenantId, filtros = {}) {
  let receitasQuery = supabaseAdmin
    .from("faturamentos")
    .select("valor_total, pago")
    .eq("tenant_id", tenantId);

  if (filtros.data_inicio) receitasQuery = receitasQuery.gte("criado_em", `${filtros.data_inicio}T00:00:00`);
  if (filtros.data_fim) receitasQuery = receitasQuery.lte("criado_em", `${filtros.data_fim}T23:59:59`);

  const { data: receitas, error: recError } = await receitasQuery;

  if (recError) throw new AppError(`Erro ao buscar receitas: ${recError.message}`);

  let despesasQuery = supabaseAdmin
    .from("contas_pagar")
    .select("valor, pago, data_vencimento")
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (filtros.data_inicio) despesasQuery = despesasQuery.gte("data_vencimento", filtros.data_inicio);
  if (filtros.data_fim) despesasQuery = despesasQuery.lte("data_vencimento", filtros.data_fim);

  const { data: despesas, error: despError } = await despesasQuery;

  if (despError) throw new AppError(`Erro ao buscar despesas: ${despError.message}`);

  const totalReceitas = receitas.reduce((acc, r) => acc + Number(r.valor_total), 0);
  const totalRecebido = receitas.filter((r) => r.pago).reduce((acc, r) => acc + Number(r.valor_total), 0);
  const totalAReceber = totalReceitas - totalRecebido;

  const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);
  const totalPago = despesas.filter((d) => d.pago).reduce((acc, d) => acc + Number(d.valor), 0);
  const totalAPagar = despesas.filter((d) => !d.pago).reduce((acc, d) => acc + Number(d.valor), 0);

  return {
    receitas: { total: totalReceitas, recebido: totalRecebido, a_receber: totalAReceber },
    despesas: { total: totalDespesas, pago: totalPago, a_pagar: totalAPagar },
    saldo: totalRecebido - totalPago,
  };
}
