import * as clienteService from "../services/clientes.service.js";

export async function criar(req, res) {
  const { nome, telefone, email } = req.body;

  if (!nome) {
    return res.status(400).json({ error: "Nome é obrigatório" });
  }

  const cliente = await clienteService.criarCliente({
    nome,
    telefone: telefone ?? null,
    email: email ?? null,
    tenantId: req.tenantId,
  });

  res.status(201).json(cliente);
}

export async function listar(req, res) {
  const { page, limit, search } = req.query;
  const result = await clienteService.listarClientes(req.tenantId, { page: Math.max(1, Number(page) || 1), limit: Math.min(100, Math.max(1, Number(limit) || 20)), search: search || "" });
  res.json(result);
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, telefone, email, ativo } = req.body;

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (telefone !== undefined) updates.telefone = telefone;
  if (email !== undefined) updates.email = email;
  if (ativo !== undefined) updates.ativo = ativo;

  const cliente = await clienteService.atualizarCliente(id, req.tenantId, updates);
  res.json(cliente);
}

export async function deletar(req, res) {
  const { id } = req.params;
  await clienteService.deletarCliente(id, req.tenantId);
  res.json({ message: "Cliente removido com sucesso" });
}
