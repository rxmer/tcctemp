import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { criarNotificacao } from "./notificacoes.service.js";

export async function criarOS({ agendamento_id, observacoes, tenantId }) {
  const { data: agendamento, error: agError } = await supabaseAdmin
    .from("agendamentos")
    .select("*, servico:servico(*), cliente:clientes(*), veiculo:veiculos(*)")
    .eq("agendamento_id", agendamento_id)
    .eq("tenant_id", tenantId)
    .single();

  if (agError) throw new AppError("Agendamento não encontrado", 404);

  if (agendamento.status !== "confirmado") {
    throw new AppError("Apenas agendamentos confirmados podem virar ordem de serviço", 400);
  }

  const { data: osData, error: osError } = await supabaseAdmin
    .from("ordens_servico")
    .insert({
      agendamento_id,
      observacoes,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (osError) throw new AppError(`Erro ao criar OS: ${osError.message}`);

  const { error: itemError } = await supabaseAdmin
    .from("itens_ordem_servico")
    .insert({
      os_id: osData.os_id,
      servico_id: agendamento.servico_id,
      descricao: agendamento.servico?.nome_servico ?? "Serviço",
      quantidade: 1,
      valor_unitario: agendamento.servico?.preco_base ?? 0,
      tenant_id: tenantId,
    });

  if (itemError) throw new AppError(`Erro ao criar item: ${itemError.message}`);

  const { error: updateAgError } = await supabaseAdmin
    .from("agendamentos")
    .update({ status: "em_andamento" })
    .eq("agendamento_id", agendamento_id)
    .eq("tenant_id", tenantId);

  if (updateAgError) throw new AppError(`Erro ao atualizar agendamento: ${updateAgError.message}`);

  await recalcularValorTotal(osData.os_id, tenantId);

  criarNotificacao({
    tenantId,
    tipo: "os_criada",
    titulo: "Ordem de serviço criada",
    mensagem: `OS #${osData.os_id} gerada para ${agendamento.cliente?.nome ?? "cliente"}`,
    referenciaTipo: "ordem_servico",
    referenciaId: osData.os_id,
  }).catch(() => {});

  return buscarOSCompleta(osData.os_id, tenantId);
}

export async function listarOS(tenantId, filtros = {}) {
  const page = filtros.page || 1;
  const limit = filtros.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("ordens_servico")
    .select(`
      *,
      agendamento:agendamentos(*, cliente:clientes(*), veiculo:veiculos(*)),
      itens:itens_ordem_servico(*, servico:servico(*)),
      faturamento:faturamentos(*)
    `, { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  const { data, error, count } = await query
    .order("os_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar OS: ${error.message}`);

  return {
    data: (data ?? []).map((os) => ({
      ...os,
      itens: (os.itens ?? []).filter((i) => !i.deletado_em),
      faturamento: os.faturamento?.[0] ?? null,
    })),
    total: count,
    page,
    limit,
  };
}

export async function buscarOSCompleta(osId, tenantId) {
  const { data: os, error } = await supabaseAdmin
    .from("ordens_servico")
    .select(`
      *,
      agendamento:agendamentos(*, cliente:clientes(*), veiculo:veiculos(*)),
      itens:itens_ordem_servico(*, servico:servico(*)),
      faturamento:faturamentos(*)
    `)
    .eq("os_id", osId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw new AppError("OS não encontrada", 404);

  return {
    ...os,
    itens: (os.itens ?? []).filter((i) => !i.deletado_em),
    faturamento: os.faturamento?.[0] ?? null,
  };
}

export async function atualizarOS(id, tenantId, updates) {
  if (updates.status === "finalizado") {
    const { data: os, error: osErr } = await supabaseAdmin
      .from("ordens_servico")
      .select("valor_total")
      .eq("os_id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (osErr || !os) throw new AppError("OS não encontrada", 404);

    const { data: faturamentoExistente } = await supabaseAdmin
      .from("faturamentos")
      .select("faturamento_id")
      .eq("os_id", id)
      .maybeSingle();

    if (!faturamentoExistente) {
      const { error: fatError } = await supabaseAdmin
        .from("faturamentos")
        .insert({
          os_id: id,
          valor_total: os.valor_total,
          tenant_id: tenantId,
        });

      if (fatError) throw new AppError(`Erro ao gerar faturamento: ${fatError.message}`);

      criarNotificacao({
        tenantId,
        tipo: "faturamento_gerado",
        titulo: "Faturamento gerado",
        mensagem: `OS #${id} finalizada - faturamento de R$ ${Number(os.valor_total).toFixed(2)}`,
        referenciaTipo: "ordem_servico",
        referenciaId: id,
      }).catch(() => {});
    }
  }

  if (updates.status === "cancelado") {
    criarNotificacao({
      tenantId,
      tipo: "os_cancelada",
      titulo: "OS cancelada",
      mensagem: `Ordem de serviço #${id} foi cancelada`,
      referenciaTipo: "ordem_servico",
      referenciaId: id,
    }).catch(() => {});
    const { data: os, error: osErr } = await supabaseAdmin
      .from("ordens_servico")
      .select("agendamento_id")
      .eq("os_id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (!osErr && os?.agendamento_id) {
      const { error: upErr } = await supabaseAdmin
        .from("agendamentos")
        .update({ status: "confirmado" })
        .eq("agendamento_id", os.agendamento_id)
        .eq("tenant_id", tenantId);
      if (upErr) throw new AppError(`Erro ao reabrir agendamento: ${upErr.message}`);
    }
  }

  const { error } = await supabaseAdmin
    .from("ordens_servico")
    .update(updates)
    .eq("os_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao atualizar OS: ${error.message}`);

  return buscarOSCompleta(id, tenantId);
}

export async function deletarOS(id, tenantId) {
  const { error } = await supabaseAdmin
    .from("ordens_servico")
    .update({ deletado_em: new Date().toISOString() })
    .eq("os_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar OS: ${error.message}`);
}

export async function adicionarItem(osId, tenantId, { servico_id, descricao, quantidade, valor_unitario }) {
  if (!descricao || !quantidade || valor_unitario == null) {
    throw new AppError("Descrição, quantidade e valor unitário são obrigatórios", 400);
  }

  const { data: os } = await supabaseAdmin
    .from("ordens_servico")
    .select("status")
    .eq("os_id", osId)
    .eq("tenant_id", tenantId)
    .single();

  if (!os) throw new AppError("OS não encontrada", 404);
  if (os.status !== "em_andamento") {
    throw new AppError("Só é possível adicionar itens em OS em andamento", 400);
  }

  const { error } = await supabaseAdmin
    .from("itens_ordem_servico")
    .insert({
      os_id: osId,
      servico_id: servico_id ?? null,
      descricao,
      quantidade,
      valor_unitario,
      tenant_id: tenantId,
    });

  if (error) throw new AppError(`Erro ao adicionar item: ${error.message}`);

  await recalcularValorTotal(osId, tenantId);

  return buscarOSCompleta(osId, tenantId);
}

export async function removerItem(osId, itemId, tenantId) {
  const { error } = await supabaseAdmin
    .from("itens_ordem_servico")
    .update({ deletado_em: new Date().toISOString() })
    .eq("item_id", itemId)
    .eq("os_id", osId)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao remover item: ${error.message}`);

  await recalcularValorTotal(osId, tenantId);

  return buscarOSCompleta(osId, tenantId);
}

async function recalcularValorTotal(osId, tenantId) {
  const { data: itens } = await supabaseAdmin
    .from("itens_ordem_servico")
    .select("quantidade, valor_unitario")
    .eq("os_id", osId)
    .is("deletado_em", null);

  const total = (itens ?? []).reduce((acc, item) => acc + item.quantidade * Number(item.valor_unitario), 0);

  const { error } = await supabaseAdmin
    .from("ordens_servico")
    .update({ valor_total: total })
    .eq("os_id", osId)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao recalcular total: ${error.message}`);
}
