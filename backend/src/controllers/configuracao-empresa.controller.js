import * as configuracaoService from "../services/configuracao-empresa.service.js";

export async function buscar(req, res) {
  const config = await configuracaoService.buscarConfiguracao(req.tenantId);
  res.json(config ?? {});
}

export async function salvar(req, res) {
  const { nome_fantasia, cnpj, telefone, email, endereco, logo_url } = req.body;
  const tel = telefone ? telefone.replace(/\D/g, "") : null;
  const result = await configuracaoService.salvarConfiguracao({
    tenantId: req.tenantId,
    nome_fantasia,
    cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
    telefone: tel && tel.length <= 11 ? `55${tel}` : tel,
    email: email || null,
    endereco: endereco || null,
    logo_url: logo_url || null,
  });
  res.json(result);
}
