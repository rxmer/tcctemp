import { logger } from "./logger.js";

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return entry;
  }

  async set(key, value, ttlSeconds) {
    this.store.set(key, value);
    if (ttlSeconds) {
      this.ttls.set(key, Date.now() + ttlSeconds * 1000);
    }
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }

  async delPattern(pattern) {
    const regex = new RegExp(pattern.replace("*", ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
      }
    }
  }

  async close() {
    this.store.clear();
    this.ttls.clear();
  }
}

let instance = null;

export async function initCache() {
  if (instance) return instance;

  const REDIS_URL = process.env.REDIS_URL;

  if (REDIS_URL) {
    try {
      const { Redis } = await import("ioredis");
      const redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
      });

      await redis.connect();
      logger.info("Redis conectado");

      instance = {
        async get(key) {
          const val = await redis.get(key);
          return val ? JSON.parse(val) : null;
        },
        async set(key, value, ttlSeconds) {
          const serialized = JSON.stringify(value);
          if (ttlSeconds) {
            await redis.setex(key, ttlSeconds, serialized);
          } else {
            await redis.set(key, serialized);
          }
        },
        async del(key) {
          await redis.del(key);
        },
        async delPattern(pattern) {
          let cursor = "0";
          do {
            const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
            if (keys.length > 0) {
              await redis.del(...keys);
            }
            cursor = nextCursor;
          } while (cursor !== "0");
        },
        async close() {
          await redis.quit();
        },
      };

      redis.on("error", (err) => {
        logger.error({ err }, "Redis connection error");
      });
    } catch (err) {
      logger.warn({ err }, "Redis não disponível, usando cache em memória");
      instance = new MemoryCache();
    }
  } else {
    logger.info("REDIS_URL não definida, usando cache em memória");
    instance = new MemoryCache();
  }

  return instance;
}

export async function getCache() {
  if (!instance) {
    return initCache();
  }
  return instance;
}
