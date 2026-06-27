import * as veiculosService from "../services/veiculos.service.js";

export async function criar(req, res) {
  const { placa, marca, modelo, ano, cor, cliente_id } = req.body;

  if (!placa || !marca || !modelo || !cliente_id) {
    return res.status(400).json({ error: "Placa, marca, modelo e cliente são obrigatórios" });
  }

  if (ano != null && (typeof ano !== "number" || ano < 1886)) {
    return res.status(400).json({ error: "Ano inválido" });
  }

  const veiculo = await veiculosService.criarVeiculo({
    placa: placa.toUpperCase(),
    marca,
    modelo,
    ano: ano ?? null,
    cor: cor ?? null,
    cliente_id,
    tenantId: req.tenantId,
  });

  res.status(201).json(veiculo);
}

export async function listar(req, res) {
  const { page, limit, search } = req.query;
  const result = await veiculosService.listarVeiculos(req.tenantId, { page: Number(page) || 1, limit: Number(limit) || 20, search: search || "" });
  res.json(result);
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { placa, marca, modelo, ano, cor, cliente_id, ativo } = req.body;

  const updates = {};
  if (placa !== undefined) updates.placa = placa.toUpperCase();
  if (marca !== undefined) updates.marca = marca;
  if (modelo !== undefined) updates.modelo = modelo;
  if (ano !== undefined) {
    if (typeof ano !== "number" || ano < 1886) {
      return res.status(400).json({ error: "Ano inválido" });
    }
    updates.ano = ano;
  }
  if (cor !== undefined) updates.cor = cor;
  if (cliente_id !== undefined) updates.cliente_id = cliente_id;
  if (ativo !== undefined) updates.ativo = ativo;

  const veiculo = await veiculosService.atualizarVeiculo(id, req.tenantId, updates);
  res.json(veiculo);
}

export async function deletar(req, res) {
  const { id } = req.params;
  await veiculosService.deletarVeiculo(id, req.tenantId);
  res.json({ message: "Veículo removido com sucesso" });
}
