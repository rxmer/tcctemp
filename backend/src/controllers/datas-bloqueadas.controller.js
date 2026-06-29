import * as datasBloqueadasService from "../services/datas-bloqueadas.service.js";

export async function listar(req, res) {
  const { ano } = req.query;
  const datas = await datasBloqueadasService.listarDatasBloqueadas(req.tenantId, ano ? Number(ano) : null);
  res.json(datas);
}

export async function criar(req, res) {
  const { data, motivo } = req.body;
  if (!data) return res.status(400).json({ error: "Data é obrigatória" });
  const result = await datasBloqueadasService.criarDataBloqueada({ data, motivo, tenantId: req.tenantId });
  res.status(201).json(result);
}

export async function remover(req, res) {
  const { id } = req.params;
  await datasBloqueadasService.removerDataBloqueada(id, req.tenantId);
  res.json({ message: "Bloqueio removido" });
}

export async function verificar(req, res) {
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: "Data é obrigatória" });
  const bloqueado = await datasBloqueadasService.verificarDataBloqueada(req.tenantId, data);
  res.json({ bloqueado });
}
