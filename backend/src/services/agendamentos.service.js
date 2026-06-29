import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { criarNotificacao } from "./notificacoes.service.js";
import { verificarDataBloqueada } from "./datas-bloqueadas.service.js";

const STATUS_FLOW = {
  pendente: ["confirmado", "cancelado"],
  confirmado: ["em_andamento", "cancelado"],
  em_andamento: ["finalizado"],
  finalizado: [],
  cancelado: [],
};

function converterHoraParaMinutos(horaStr) {
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m;
}

export async function buscarAgendamentosDoDia(tenantId, data) {
  const { data: ags, error } = await supabaseAdmin
    .from("agendamentos")
    .select("hora_agendamento, servico:servico(duracao_min)")
    .eq("tenant_id", tenantId)
    .eq("data_agendamento", data)
    .is("deletado_em", null)
    .in("status", ["pendente", "confirmado", "em_andamento"]);

  if (error) return [];
  return ags ?? [];
}

export async function buscarDuracaoServico(tenantId, servicoId) {
  const { data, error } = await supabaseAdmin
    .from("servico")
    .select("duracao_min")
    .eq("servico_id", servicoId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) return 30;
  return data.duracao_min || 30;
}

export async function verificarDisponibilidade(tenantId, data, hora, servicoId) {
  const duracaoMin = servicoId ? await buscarDuracaoServico(tenantId, servicoId) : 30;
  const inicioNovo = converterHoraParaMinutos(hora);
  const fimNovo = inicioNovo + duracaoMin;

  const agendamentos = await buscarAgendamentosDoDia(tenantId, data);

  for (const ag of agendamentos) {
    const inicioExistente = converterHoraParaMinutos(ag.hora_agendamento);
    const duracaoExistente = ag.servico?.duracao_min || 30;
    const fimExistente = inicioExistente + duracaoExistente;

    if (inicioNovo < fimExistente && inicioExistente < fimNovo) {
      return false;
    }
  }

  return true;
}

export async function listarAgendamentosCliente(tenantId, clienteId, statusFilter = null) {
  let query = supabaseAdmin
    .from("agendamentos")
    .select("*, cliente:clientes(*), veiculo:veiculos(*), servico:servico(*)")
    .eq("tenant_id", tenantId)
    .eq("cliente_id", clienteId)
    .is("deletado_em", null);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query.order("data_agendamento", { ascending: true }).order("hora_agendamento", { ascending: true });

  if (error) throw new AppError(`Erro ao listar agendamentos: ${error.message}`);
  return data ?? [];
}

export async function criarAgendamento({ cliente_id, veiculo_id, servico_id, data_agendamento, hora_agendamento, observacoes, tenantId, criadoPor, fonte }) {
  const hoje = new Date().toISOString().split("T")[0];
  if (data_agendamento < hoje) {
    throw new AppError("Não é possível agendar para uma data passada", 400);
  }

  const bloqueada = await verificarDataBloqueada(tenantId, data_agendamento);
  if (bloqueada) {
    throw new AppError("Esta data está bloqueada (feriado/recesso). Escolha outra data.", 400);
  }

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

  const { data: servico } = await supabaseAdmin
    .from("servico")
    .select("duracao_min")
    .eq("servico_id", servico_id)
    .eq("tenant_id", tenantId)
    .single();

  const duracaoMin = servico?.duracao_min || 30;

  const [hIni, mIni] = hora_agendamento.split(":").map(Number);
  const inicioNovo = hIni * 60 + mIni;
  const fimNovo = inicioNovo + duracaoMin;

  const [hFecha, mFecha] = expediente.fechamento.split(":").map(Number);
  const fimExpediente = hFecha * 60 + mFecha;

  if (fimNovo > fimExpediente) {
    throw new AppError(`O serviço dura ${duracaoMin} min e não coube no expediente. Escolha um horário mais cedo.`, 400);
  }

  const { data: agsDoDia } = await supabaseAdmin
    .from("agendamentos")
    .select("hora_agendamento, servico:servico(duracao_min)")
    .eq("data_agendamento", data_agendamento)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .in("status", ["pendente", "confirmado", "em_andamento"]);

  for (const ag of agsDoDia ?? []) {
    const [hE, mE] = ag.hora_agendamento.split(":").map(Number);
    const inicioExistente = hE * 60 + mE;
    const duracaoExistente = ag.servico?.duracao_min || 30;
    const fimExistente = inicioExistente + duracaoExistente;

    if (inicioNovo < fimExistente && inicioExistente < fimNovo) {
      throw new AppError("Este horário conflita com outro agendamento", 409);
    }
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

  const { data: conflitoPos } = await supabaseAdmin
    .from("agendamentos")
    .select("agendamento_id")
    .eq("data_agendamento", data_agendamento)
    .eq("hora_agendamento", hora_agendamento)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .in("status", ["pendente", "confirmado", "em_andamento"])
    .neq("agendamento_id", data.agendamento_id);

  if (conflitoPos && conflitoPos.length > 0) {
    await supabaseAdmin
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("agendamento_id", data.agendamento_id)
      .eq("tenant_id", tenantId);
    throw new AppError("Conflito detectado após criação. Tente outro horário.", 409);
  }

  const nomeCliente = data.cliente?.nome ?? "Cliente";
  const fonteMsg = fonte ? ` (${fonte})` : "";
  criarNotificacao({
    tenantId,
    tipo: "agendamento_criado",
    titulo: `Novo agendamento${fonteMsg}`,
    mensagem: `Agendamento para ${nomeCliente} em ${data.data_agendamento} às ${data.hora_agendamento}${fonteMsg}`,
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
  let current = null;

  if (updates.status || updates.data_agendamento || updates.hora_agendamento) {
    const { data, error: fetchError } = await supabaseAdmin
      .from("agendamentos")
      .select("status, data_agendamento, hora_agendamento, servico_id")
      .eq("agendamento_id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError) throw new AppError("Agendamento não encontrado", 404);
    current = data;
  }

  if (updates.status) {
    const allowed = STATUS_FLOW[current.status];
    if (!allowed.includes(updates.status)) {
      throw new AppError(`Não é permitido mudar de "${current.status}" para "${updates.status}"`, 400);
    }

    if (updates.status === "cancelado") {
      const { data: os } = await supabaseAdmin
        .from("ordens_servico")
        .select("status")
        .eq("agendamento_id", id)
        .eq("tenant_id", tenantId)
        .is("deletado_em", null)
        .maybeSingle();

      if (os && os.status === "finalizado") {
        throw new AppError("Não é possível cancelar um agendamento com OS finalizada", 400);
      }

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
    const hoje = new Date().toISOString().split("T")[0];
    if (updates.data_agendamento && updates.data_agendamento < hoje) {
      throw new AppError("Não é possível agendar para uma data passada", 400);
    }

    const dataFinal = updates.data_agendamento || current.data_agendamento;
    const horaFinal = updates.hora_agendamento || current.hora_agendamento;

    const diaSemana = new Date(dataFinal + "T" + horaFinal).getDay();
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

    if (horaFinal < expediente.abertura || horaFinal >= expediente.fechamento) {
      throw new AppError("Horário fora do expediente", 400);
    }

    const { data: servico } = await supabaseAdmin
      .from("servico")
      .select("duracao_min")
      .eq("servico_id", current.servico_id || updates.servico_id)
      .eq("tenant_id", tenantId)
      .single();

    const duracaoMin = servico?.duracao_min || 30;
    const [hIni, mIni] = horaFinal.split(":").map(Number);
    const inicioNovo = hIni * 60 + mIni;
    const fimNovo = inicioNovo + duracaoMin;
    const [hFecha, mFecha] = expediente.fechamento.split(":").map(Number);
    const fimExpediente = hFecha * 60 + mFecha;

    if (fimNovo > fimExpediente) {
      throw new AppError(`O serviço dura ${duracaoMin} min e não coube no expediente. Escolha um horário mais cedo.`, 400);
    }

    const { data: agsDoDia } = await supabaseAdmin
      .from("agendamentos")
      .select("hora_agendamento, servico:servico(duracao_min)")
      .eq("data_agendamento", dataFinal)
      .eq("tenant_id", tenantId)
      .is("deletado_em", null)
      .in("status", ["pendente", "confirmado", "em_andamento"])
      .neq("agendamento_id", id);

    for (const ag of agsDoDia ?? []) {
      const [hE, mE] = ag.hora_agendamento.split(":").map(Number);
      const inicioExistente = hE * 60 + mE;
      const duracaoExistente = ag.servico?.duracao_min || 30;
      const fimExistente = inicioExistente + duracaoExistente;

      if (inicioNovo < fimExistente && inicioExistente < fimNovo) {
        throw new AppError("Este horário conflita com outro agendamento", 409);
      }
    }

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
      titulo: `Agendamento ${statusLabel[updates.status] || updates.status}`,
      mensagem: `Agendamento ${nomeRel} alterado para "${statusLabel[updates.status] || updates.status}"`,
      referenciaTipo: "agendamento",
      referenciaId: id,
    }).catch(() => {});
  }

  return data;
}

export async function deletarAgendamento(id, tenantId) {
  const { data: ag, error: fetchError } = await supabaseAdmin
    .from("agendamentos")
    .select("status")
    .eq("agendamento_id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) throw new AppError("Agendamento não encontrado", 404);

  if (ag.status === "finalizado") {
    throw new AppError("Não é possível excluir um agendamento finalizado", 400);
  }

  const { data: os } = await supabaseAdmin
    .from("ordens_servico")
    .select("os_id, status")
    .eq("agendamento_id", id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .maybeSingle();

  if (os) {
    throw new AppError("Não é possível excluir um agendamento que possui ordem de serviço vinculada", 400);
  }

  const { error } = await supabaseAdmin
    .from("agendamentos")
    .update({ deletado_em: new Date().toISOString() })
    .eq("agendamento_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar agendamento: ${error.message}`);
}
