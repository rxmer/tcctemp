import * as funcionariosService from "../services/funcionarios.service.js";

export async function criar(req, res) {
  if (req.perfil !== "admin") {
    return res.status(403).json({ error: "Apenas administradores podem cadastrar funcionários" });
  }

  const { nome, email, senha, telefone } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }

  if (senha.length < 8) {
    return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
  }

  const result = await funcionariosService.criarFuncionario({
    nome,
    email,
    senha,
    telefone,
    perfil: "funcionario",
    tenantId: req.tenantId,
  });

  res.status(201).json(result);
}

export async function listar(req, res) {
  const funcionarios = await funcionariosService.listarFuncionarios(req.tenantId);
  res.json(funcionarios);
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, email } = req.body;
  const result = await funcionariosService.atualizarFuncionario(id, { nome, email }, req.tenantId);
  res.json(result);
}

export async function deletar(req, res) {
  const { id } = req.params;
  await funcionariosService.deletarFuncionario(id, req.tenantId, req.userId);
  res.json({ message: "Funcionário excluído com sucesso" });
}

export async function redefinirSenha(req, res) {
  const { id } = req.params;
  const { senha } = req.body;
  await funcionariosService.redefinirSenha(id, senha, req.tenantId);
  res.json({ message: "Senha redefinida com sucesso" });
}
