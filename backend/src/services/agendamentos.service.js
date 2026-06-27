import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { criarNotificacao } from "./notificacoes.service.js";

const STATUS_FLOW = {
  pendente: ["confirmado", "cancelado"],
  confirmado: ["em_andamento", "cancelado"],
  em_andamento: ["finalizado"],
  finalizado: [],
  cancelado: [],
};

export async function criarAgendamento({ cliente_id, veiculo_id, servico_id, data_agendamento, hora_agendamento, observacoes, tenantId, criadoPor }) {
  const diaSemana = new Date(data_agendamento + "T" + hora_agendamento).getDay();

  const { data: expediente } = await supabaseAdmin
    .from("configuracao_expediente")
    .select("abertura, fechamento")
    .eq("dia_semana", diaSemana)
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .maybeSingle();

  if (!expediente) {
    throw new AppError("Não há expediente neste dia da semana", 400);
  }

  if (hora_agendamento < expediente.abertura || hora_agendamento >= expediente.fechamento) {
    throw new AppError("Horário fora do expediente", 400);
  }

  const { count: conflito } = await supabaseAdmin
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("data_agendamento", data_agendamento)
    .eq("hora_agendamento", hora_agendamento)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .in("status", ["pendente", "confirmado", "em_andamento"]);

  if (conflito > 0) {
    throw new AppError("Já existe um agendamento neste horário", 409);
  }

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .insert({
      cliente_id,
      veiculo_id,
      servico_id,
      data_agendamento,
      hora_agendamento,
      observacoes,
      tenant_id: tenantId,
      criado_por: criadoPor,
    })
    .select("*, cliente:clientes(*), veiculo:veiculos(*), servico:servico(*)")
    .single();

  if (error) throw new AppError(`Erro ao criar agendamento: ${error.message}`);

  const nomeCliente = data.cliente?.nome ?? "Cliente";
  criarNotificacao({
    tenantId,
    tipo: "agendamento_criado",
    titulo: "Novo agendamento",
    mensagem: `Agendamento para ${nomeCliente} em ${data.data_agendamento} às ${data.hora_agendamento}`,
    referenciaTipo: "agendamento",
    referenciaId: data.agendamento_id,
  }).catch(() => {});

  return data;
}

export async function listarAgendamentos(tenantId, filtros = {}) {
  const page = filtros.page || 1;
  const limit = filtros.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("agendamentos")
    .select("*, cliente:clientes(*), veiculo:veiculos(*), servico:servico(*)", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (filtros.data_inicio) {
    query = query.gte("data_agendamento", filtros.data_inicio);
  }

  if (filtros.data_fim) {
    query = query.lte("data_agendamento", filtros.data_fim);
  }

  if (filtros.status) {
    query = query.eq("status", filtros.status);
  }

  if (filtros.cliente_id) {
    query = query.eq("cliente_id", filtros.cliente_id);
  }

  const { data, error, count } = await query
    .order("data_agendamento", { ascending: false })
    .order("hora_agendamento", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar agendamentos: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarAgendamento(id, tenantId, updates) {
  if (updates.status) {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("agendamentos")
      .select("status, data_agendamento, hora_agendamento")
      .eq("agendamento_id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError) throw new AppError("Agendamento não encontrado", 404);

    const allowed = STATUS_FLOW[current.status];
    if (!allowed.includes(updates.status)) {
      throw new AppError(`Não é permitido mudar de "${current.status}" para "${updates.status}"`, 400);
    }

    if (updates.status === "cancelado") {
      const [y, m, d] = current.data_agendamento.split("-").map(Number);
      const [hh, mm] = current.hora_agendamento.split(":").map(Number);
      const agendamentoDateTime = new Date(y, m - 1, d, hh, mm);
      const agora = new Date();
      const diffMs = agendamentoDateTime.getTime() - agora.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);

      if (diffHoras < 2) {
        throw new AppError("Cancelamento deve ter antecedência mínima de 2 horas", 400);
      }
    }

    if (updates.status === "confirmado") {
      updates.lembrete_enviado = null;
    }
  }

  if (updates.data_agendamento || updates.hora_agendamento) {
    updates.lembrete_enviado = null;
  }

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .update(updates)
    .eq("agendamento_id", id)
    .eq("tenant_id", tenantId)
    .select("*, cliente:clientes(*), veiculo:veiculos(*), servico:servico(*)")
    .single();

  if (error) throw new AppError(`Erro ao atualizar agendamento: ${error.message}`);

  if (updates.status) {
    const statusLabel = { pendente: "Pendente", confirmado: "Confirmado", em_andamento: "Em andamento", finalizado: "Finalizado", cancelado: "Cancelado" };
    const nomeRel = data.cliente?.nome ? `para ${data.cliente.nome}` : "";
    criarNotificacao({
      tenantId,
      tipo: `agendamento_${updates.status}`,
      titulo: `Agendamento ${updates.status}`,
      mensagem: `Agendamento ${nomeRel} alterado para "${statusLabel[updates.status] || updates.status}"`,
      referenciaTipo: "agendamento",
      referenciaId: id,
    }).catch(() => {});
  }

  return data;
}

export async function deletarAgendamento(id, tenantId) {
  const { error } = await supabaseAdmin
    .from("agendamentos")
    .update({ deletado_em: new Date().toISOString() })
    .eq("agendamento_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar agendamento: ${error.message}`);
}
