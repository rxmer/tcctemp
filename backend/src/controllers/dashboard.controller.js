import * as dashboardService from "../services/dashboard.service.js";

export async function resumo(req, res) {
  const dados = await dashboardService.resumoDashboard(req.tenantId);
  res.json(dados);
}
