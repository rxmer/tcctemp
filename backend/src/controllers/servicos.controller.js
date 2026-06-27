import * as servicosService from "../services/servicos.service.js";

export async function criar(req, res) {
  const { nome_servico, descricao, preco_base, duracao_min } = req.body;

  if (!nome_servico || preco_base == null || !duracao_min) {
    return res.status(400).json({ error: "Nome, preço base e duração são obrigatórios" });
  }

  if (typeof preco_base !== "number" || preco_base < 0) {
    return res.status(400).json({ error: "Preço base deve ser um número positivo" });
  }

  if (typeof duracao_min !== "number" || duracao_min < 1) {
    return res.status(400).json({ error: "Duração deve ser maior que zero" });
  }

  const servico = await servicosService.criarServico({
    nome_servico,
    descricao,
    preco_base,
    duracao_min,
    tenantId: req.tenantId,
  });

  res.status(201).json(servico);
}

export async function listar(req, res) {
  const { page, limit, search } = req.query;
  const result = await servicosService.listarServicos(req.tenantId, { page: Number(page) || 1, limit: Number(limit) || 20, search: search || "" });
  res.json(result);
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { nome_servico, descricao, preco_base, duracao_min, ativo } = req.body;

  const updates = {};
  if (nome_servico !== undefined) updates.nome_servico = nome_servico;
  if (descricao !== undefined) updates.descricao = descricao;
  if (preco_base !== undefined) {
    if (typeof preco_base !== "number" || preco_base < 0) {
      return res.status(400).json({ error: "Preço base deve ser um número positivo" });
    }
    updates.preco_base = preco_base;
  }
  if (duracao_min !== undefined) {
    if (typeof duracao_min !== "number" || duracao_min < 1) {
      return res.status(400).json({ error: "Duração deve ser maior que zero" });
    }
    updates.duracao_min = duracao_min;
  }
  if (ativo !== undefined) updates.ativo = ativo;

  const servico = await servicosService.atualizarServico(id, req.tenantId, updates);
  res.json(servico);
}

export async function deletar(req, res) {
  const { id } = req.params;
  await servicosService.deletarServico(id, req.tenantId);
  res.json({ message: "Serviço removido com sucesso" });
}

export async function toggleAtivo(req, res) {
  const { id } = req.params;
  const servico = await servicosService.toggleAtivoServico(id, req.tenantId);
  res.json(servico);
}
