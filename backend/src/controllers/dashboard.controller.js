import * as dashboardService from "../services/dashboard.service.js";
import { cacheGetOrSet, cacheDelPattern, buildCacheKey } from "../utils/cache.js";

const DASHBOARD_TTL = 30;

function dashboardKey(tenantId) {
  return buildCacheKey("dashboard", tenantId, "resumo");
}

export async function resumo(req, res) {
  const dados = await cacheGetOrSet(
    dashboardKey(req.tenantId),
    () => dashboardService.resumoDashboard(req.tenantId),
    DASHBOARD_TTL
  );
  res.json(dados);
}

export async function invalidarDashboardCache(tenantId) {
  return cacheDelPattern(`dashboard:${tenantId}:*`);
}
