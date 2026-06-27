import { getCache } from "../config/cache.js";

export async function cacheGetOrSet(key, fetchFn, ttlSeconds = 300) {
  const cache = await getCache();
  const cached = await cache.get(key);
  if (cached !== null) return cached;

  const value = await fetchFn();
  await cache.set(key, value, ttlSeconds);
  return value;
}

export async function cacheDel(key) {
  const cache = await getCache();
  await cache.del(key);
}

export async function cacheDelPattern(pattern) {
  const cache = await getCache();
  await cache.delPattern(pattern);
}

export function buildCacheKey(prefix, ...parts) {
  return `${prefix}:${parts.join(":")}`;
}

export function invalidateReportCache(tenantId) {
  return cacheDelPattern(`report:${tenantId}:*`);
}

export function invalidateNotificationCache(tenantId) {
  return cacheDelPattern(`notif:${tenantId}:*`);
}
