import * as financeiroService from "../services/financeiro.service.js";
import { dataLocalISO } from "../utils/data.js";

export async function criarConta(req, res) {
  const { descricao, valor, data_vencimento, observacoes } = req.body;

  if (!descricao) {
    return res.status(400).json({ error: "Descrição é obrigatória" });
  }
  if (valor == null || isNaN(Number(valor)) || Number(valor) <= 0) {
    return res.status(400).json({ error: "Valor deve ser um número positivo" });
  }
  if (!data_vencimento) {
    return res.status(400).json({ error: "Data de vencimento é obrigatória" });
  }

  const conta = await financeiroService.criarContaPagar({
    descricao, valor, data_vencimento, observacoes: observacoes ?? null, tenantId: req.tenantId,
  });
  res.status(201).json(conta);
}

export async function listarContas(req, res) {
  const { data_inicio, data_fim, pago, page, limit } = req.query;
  const filtros = {};
  if (data_inicio) filtros.data_inicio = data_inicio;
  if (data_fim) filtros.data_fim = data_fim;
  if (pago !== undefined) filtros.pago = pago;
  filtros.page = Math.max(1, Number(page) || 1);
  filtros.limit = Math.min(100, Math.max(1, Number(limit) || 20));

  const result = await financeiroService.listarContasPagar(req.tenantId, filtros);
  res.json(result);
}

export async function atualizarConta(req, res) {
  const { id } = req.params;
  const { descricao, valor, data_vencimento, data_pagamento, pago, observacoes } = req.body;

  const contaAtual = await financeiroService.buscarContaPagar(id, req.tenantId);
  if (contaAtual.pago && (descricao !== undefined || valor !== undefined || data_vencimento !== undefined)) {
    return res.status(400).json({ error: "Não é possível alterar descrição, valor ou vencimento de uma conta já paga" });
  }

  const updates = {};
  if (descricao !== undefined) updates.descricao = descricao;
  if (valor !== undefined) updates.valor = valor;
  if (data_vencimento !== undefined) updates.data_vencimento = data_vencimento;
  if (data_pagamento !== undefined) updates.data_pagamento = data_pagamento;
  if (pago !== undefined) updates.pago = pago;
  if (observacoes !== undefined) updates.observacoes = observacoes;

  const contaAtualizada = await financeiroService.atualizarContaPagar(id, req.tenantId, updates);
  res.json(contaAtualizada);
}

export async function pagarConta(req, res) {
  const { id } = req.params;
  const conta = await financeiroService.buscarContaPagar(id, req.tenantId);
  if (conta.pago) {
    return res.status(400).json({ error: "Esta conta já foi paga" });
  }
  const hoje = dataLocalISO();
  const result = await financeiroService.atualizarContaPagar(id, req.tenantId, { pago: true, data_pagamento: hoje });
  res.json(result);
}

export async function deletarConta(req, res) {
  const { id } = req.params;
  await financeiroService.deletarContaPagar(id, req.tenantId);
  res.json({ message: "Conta removida com sucesso" });
}

export async function listarFaturamentos(req, res) {
  const { data_inicio, data_fim, pago, page, limit } = req.query;
  const filtros = {};
  if (data_inicio) filtros.data_inicio = data_inicio;
  if (data_fim) filtros.data_fim = data_fim;
  if (pago !== undefined) filtros.pago = pago;
  filtros.page = Math.max(1, Number(page) || 1);
  filtros.limit = Math.min(100, Math.max(1, Number(limit) || 20));

  const result = await financeiroService.listarFaturamentos(req.tenantId, filtros);
  res.json(result);
}

export async function receberFaturamento(req, res) {
  const { id } = req.params;
  const { data_pagamento } = req.body;
  const fat = await financeiroService.buscarFaturamento(id, req.tenantId);
  if (fat.pago) {
    return res.status(400).json({ error: "Este faturamento já foi recebido" });
  }
  const result = await financeiroService.registrarPagamentoFaturamento(id, req.tenantId, data_pagamento);
  res.json(result);
}

export async function resumo(req, res) {
  const { data_inicio, data_fim } = req.query;
  const filtros = {};
  if (data_inicio) filtros.data_inicio = data_inicio;
  if (data_fim) filtros.data_fim = data_fim;

  const result = await financeiroService.resumoFinanceiro(req.tenantId, filtros);
  res.json(result);
}
