import * as comunicadosService from "../services/comunicados.service.js";
import * as configuracaoService from "../services/configuracao-empresa.service.js";

export async function criar(req, res) {
  const { mensagem, filtro } = req.body;
  const config = await configuracaoService.buscarConfiguracao(req.tenantId).catch(() => null);
  const result = await comunicadosService.criarComunicado({
    tenantId: req.tenantId,
    nomeEmpresa: config?.nome_fantasia || "Esteticar",
    mensagem,
    filtro: filtro ?? "todos",
  });
  res.status(201).json(result);
}

export async function listar(req, res) {
  const comunicados = await comunicadosService.listarComunicados(req.tenantId);
  res.json(comunicados);
}
