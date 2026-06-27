import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function relatorioAgendamentos(tenantId, { data_inicio, data_fim, agrupar_por } = {}) {
  let query = supabaseAdmin
    .from("agendamentos")
    .select("agendamento_id, data_agendamento, status, servico:servico(nome_servico)")
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .order("data_agendamento", { ascending: true });

  if (data_inicio) query = query.gte("data_agendamento", data_inicio);
  if (data_fim) query = query.lte("data_agendamento", data_fim);

  const { data, error } = await query;
  if (error) throw new AppError(`Erro ao gerar relatório de agendamentos: ${error.message}`);

  const agrupar = agrupar_por || "dia";
  const grupos = {};

  for (const a of data) {
    let chave;
    if (agrupar === "mes") {
      chave = a.data_agendamento.slice(0, 7);
    } else if (agrupar === "semana") {
      const d = new Date(a.data_agendamento + "T12:00:00");
      const inicioSemana = new Date(d);
      inicioSemana.setDate(d.getDate() - d.getDay());
      chave = inicioSemana.toISOString().slice(0, 10);
    } else {
      chave = a.data_agendamento;
    }

    if (!grupos[chave]) grupos[chave] = { periodo: chave, total: 0, por_status: {} };
    grupos[chave].total++;
    grupos[chave].por_status[a.status] = (grupos[chave].por_status[a.status] || 0) + 1;
  }

  return Object.values(grupos).sort((a, b) => a.periodo.localeCompare(b.periodo));
}

export async function relatorioServicos(tenantId, { data_inicio, data_fim } = {}) {
  let query = supabaseAdmin
    .from("itens_ordem_servico")
    .select("quantidade, valor_unitario, servico:servico(nome_servico)")
    .eq("tenant_id", tenantId);

  if (data_inicio) query = query.gte("criado_em", data_inicio);
  if (data_fim) query = query.lte("criado_em", data_fim);

  const { data, error } = await query;
  if (error) throw new AppError(`Erro ao gerar relatório de serviços: ${error.message}`);

  const servicos = {};
  for (const item of data) {
    const nome = item.servico?.nome_servico || "Sem nome";
    if (!servicos[nome]) servicos[nome] = { nome, quantidade: 0, receita: 0 };
    servicos[nome].quantidade += item.quantidade;
    servicos[nome].receita += Number(item.valor_unitario) * item.quantidade;
  }

  return Object.values(servicos).sort((a, b) => b.receita - a.receita);
}

export async function relatorioFinanceiro(tenantId, { data_inicio, data_fim } = {}) {
  let queryRec = supabaseAdmin
    .from("faturamentos")
    .select("criado_em, valor_total, pago")
    .eq("tenant_id", tenantId);

  if (data_inicio) queryRec = queryRec.gte("criado_em", data_inicio);
  if (data_fim) queryRec = queryRec.lte("criado_em", data_fim);

  const { data: receitas, error: recError } = await queryRec;
  if (recError) throw new AppError(`Erro ao gerar relatório financeiro: ${recError.message}`);

  let queryDesp = supabaseAdmin
    .from("contas_pagar")
    .select("data_vencimento, valor, pago")
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (data_inicio) queryDesp = queryDesp.gte("data_vencimento", data_inicio);
  if (data_fim) queryDesp = queryDesp.lte("data_vencimento", data_fim);

  const { data: despesas, error: despError } = await queryDesp;
  if (despError) throw new AppError(`Erro ao gerar relatório financeiro: ${despError.message}`);

  const meses = {};

  for (const r of receitas) {
    const mes = r.criado_em.slice(0, 7);
    if (!meses[mes]) meses[mes] = { mes, receitas: 0, despesas: 0, recebido: 0, pago: 0 };
    meses[mes].receitas += Number(r.valor_total);
    if (r.pago) meses[mes].recebido += Number(r.valor_total);
  }

  for (const d of despesas) {
    const mes = d.data_vencimento.slice(0, 7);
    if (!meses[mes]) meses[mes] = { mes, receitas: 0, despesas: 0, recebido: 0, pago: 0 };
    meses[mes].despesas += Number(d.valor);
    if (d.pago) meses[mes].pago += Number(d.valor);
  }

  return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));
}

export async function relatorioStatus(tenantId, { data_inicio, data_fim } = {}) {
  let query = supabaseAdmin
    .from("agendamentos")
    .select("status")
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (data_inicio) query = query.gte("data_agendamento", data_inicio);
  if (data_fim) query = query.lte("data_agendamento", data_fim);

  const { data, error } = await query;
  if (error) throw new AppError(`Erro ao gerar relatório de status: ${error.message}`);

  const statusMap = {};
  for (const a of data) {
    const s = a.status;
    statusMap[s] = (statusMap[s] || 0) + 1;
  }

  return Object.entries(statusMap).map(([status, quantidade]) => ({
    status,
    quantidade,
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}

export async function relatorioGeral(tenantId, filtros = {}) {
  const [agendamentos, servicos, financeiro, statusCount] = await Promise.all([
    relatorioAgendamentos(tenantId, filtros),
    relatorioServicos(tenantId, filtros),
    relatorioFinanceiro(tenantId, filtros),
    relatorioStatus(tenantId, filtros),
  ]);

  return { agendamentos, servicos, financeiro, status: statusCount };
}
