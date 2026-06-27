import * as notificacoesService from "../services/notificacoes.service.js";
import { cacheGetOrSet, cacheDel, buildCacheKey, invalidateNotificationCache } from "../utils/cache.js";

function countKey(tenantId) {
  return buildCacheKey("notif", tenantId, "count");
}

export async function listar(req, res) {
  const apenasNaoLidas = req.query.apenas_nao_lidas === "true";
  const notificacoes = await notificacoesService.listarNotificacoes(req.tenantId, { apenasNaoLidas });
  res.json(notificacoes);
}

export async function marcarLida(req, res) {
  const { id } = req.params;
  const notificacao = await notificacoesService.marcarComoLida(id, req.tenantId);
  await cacheDel(countKey(req.tenantId));
  res.json(notificacao);
}

export async function marcarTodasLidas(req, res) {
  await notificacoesService.marcarTodasComoLidas(req.tenantId);
  await cacheDel(countKey(req.tenantId));
  res.json({ message: "Todas notificações marcadas como lidas" });
}

export async function contar(req, res) {
  const count = await cacheGetOrSet(countKey(req.tenantId), () => notificacoesService.contarNaoLidas(req.tenantId), 30);
  res.json({ count });
}
