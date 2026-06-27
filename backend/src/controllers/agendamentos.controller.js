import * as agendamentoService from "../services/agendamentos.service.js";

export async function criar(req, res) {
  const { cliente_id, veiculo_id, servico_id, data_agendamento, hora_agendamento, observacoes } = req.body;

  if (!cliente_id || !veiculo_id || !servico_id || !data_agendamento || !hora_agendamento) {
    return res.status(400).json({ error: "Cliente, veículo, serviço, data e hora são obrigatórios" });
  }

  const agendamento = await agendamentoService.criarAgendamento({
    cliente_id,
    veiculo_id,
    servico_id,
    data_agendamento,
    hora_agendamento,
    observacoes: observacoes ?? null,
    tenantId: req.tenantId,
    criadoPor: req.userId,
  });

  res.status(201).json(agendamento);
}

export async function listar(req, res) {
  const { data_inicio, data_fim, status, cliente_id, page, limit } = req.query;

  const filtros = {};
  if (data_inicio) filtros.data_inicio = data_inicio;
  if (data_fim) filtros.data_fim = data_fim;
  if (status) filtros.status = status;
  if (cliente_id) filtros.cliente_id = Number(cliente_id);
  filtros.page = Number(page) || 1;
  filtros.limit = Number(limit) || 20;

  const result = await agendamentoService.listarAgendamentos(req.tenantId, filtros);
  res.json(result);
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { cliente_id, veiculo_id, servico_id, data_agendamento, hora_agendamento, status, observacoes } = req.body;

  const updates = {};
  if (cliente_id !== undefined) updates.cliente_id = cliente_id;
  if (veiculo_id !== undefined) updates.veiculo_id = veiculo_id;
  if (servico_id !== undefined) updates.servico_id = servico_id;
  if (data_agendamento !== undefined) updates.data_agendamento = data_agendamento;
  if (hora_agendamento !== undefined) updates.hora_agendamento = hora_agendamento;
  if (status !== undefined) updates.status = status;
  if (observacoes !== undefined) updates.observacoes = observacoes;

  const agendamento = await agendamentoService.atualizarAgendamento(id, req.tenantId, updates);
  res.json(agendamento);
}

export async function deletar(req, res) {
  const { id } = req.params;
  await agendamentoService.deletarAgendamento(id, req.tenantId);
  res.json({ message: "Agendamento removido com sucesso" });
}
