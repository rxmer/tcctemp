import * as osService from "../services/ordens_servico.service.js";

export async function criar(req, res) {
  const { agendamento_id, observacoes } = req.body;

  if (!agendamento_id) {
    return res.status(400).json({ error: "Agendamento é obrigatório" });
  }

  const os = await osService.criarOS({
    agendamento_id,
    observacoes: observacoes ?? null,
    tenantId: req.tenantId,
  });

  res.status(201).json(os);
}

export async function listar(req, res) {
  const { status, page, limit } = req.query;
  const filtros = {};
  if (status) filtros.status = status;
  filtros.page = Number(page) || 1;
  filtros.limit = Number(limit) || 20;

  const result = await osService.listarOS(req.tenantId, filtros);
  res.json(result);
}

export async function buscarPorId(req, res) {
  const { id } = req.params;
  const os = await osService.buscarOSCompleta(id, req.tenantId);
  res.json(os);
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { status, observacoes } = req.body;

  const updates = {};
  if (status !== undefined) updates.status = status;
  if (observacoes !== undefined) updates.observacoes = observacoes;

  const os = await osService.atualizarOS(id, req.tenantId, updates);
  res.json(os);
}

export async function deletar(req, res) {
  const { id } = req.params;
  await osService.deletarOS(id, req.tenantId);
  res.json({ message: "Ordem de serviço removida com sucesso" });
}

export async function adicionarItem(req, res) {
  const { id } = req.params;
  const { servico_id, descricao, quantidade, valor_unitario } = req.body;

  const os = await osService.adicionarItem(id, req.tenantId, {
    servico_id: servico_id ?? null,
    descricao,
    quantidade,
    valor_unitario,
  });

  res.status(201).json(os);
}

export async function removerItem(req, res) {
  const { id, itemId } = req.params;
  const os = await osService.removerItem(id, itemId, req.tenantId);
  res.json(os);
}
