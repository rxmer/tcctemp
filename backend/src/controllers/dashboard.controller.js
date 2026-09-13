import * as dashboardService from "../services/dashboard.service.js";
import { cacheGetOrSet, cacheDelPattern, buildCacheKey } from "../utils/cache.js";

const DASHBOARD_TTL = 30;

function dashboardKey(tenantId, perfil) {
  return buildCacheKey("dashboard", tenantId, perfil, "resumo");
}

export async function resumo(req, res) {
  const perfil = req.perfil ?? "funcionario";
  const dados = await cacheGetOrSet(
    dashboardKey(req.tenantId, perfil),
    () => dashboardService.resumoDashboard(req.tenantId),
    DASHBOARD_TTL
  );

  if (perfil === "admin") {
    return res.json(dados);
  }

  const { faturamento_mes, ...resto } = dados;
  res.json(resto);
}

export async function invalidarDashboardCache(tenantId) {
  return cacheDelPattern(`dashboard:${tenantId}:*`);
}
