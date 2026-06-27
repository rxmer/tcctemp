import { describe, it, expect, vi, beforeEach } from "vitest";
import { initCache, getCache } from "../config/cache.js";

vi.mock("../config/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initCache", () => {
    it("deve retornar instancia de cache", async () => {
      const cache = await initCache();
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe("function");
      expect(typeof cache.set).toBe("function");
      expect(typeof cache.del).toBe("function");
    });

    it("deve retornar mesma instancia em chamadas subsequentes", async () => {
      const cache1 = await initCache();
      const cache2 = await initCache();
      expect(cache1).toBe(cache2);
    });
  });

  describe("getCache", () => {
    it("deve inicializar cache se nao existir", async () => {
      const cache = await getCache();
      expect(cache).toBeDefined();
    });
  });

  describe("operações do cache", () => {
    it("deve armazenar e recuperar valor", async () => {
      const cache = await initCache();
      await cache.set("test-key", { data: "teste" });
      const result = await cache.get("test-key");
      expect(result).toEqual({ data: "teste" });
    });

    it("deve retornar null para chave inexistente", async () => {
      const cache = await initCache();
      const result = await cache.get("chave-inexistente");
      expect(result).toBeNull();
    });

    it("deve remover chave", async () => {
      const cache = await initCache();
      await cache.set("del-key", "valor");
      await cache.del("del-key");
      const result = await cache.get("del-key");
      expect(result).toBeNull();
    });

    it("deve limpar cache ao fechar", async () => {
      const cache = await initCache();
      await cache.set("key1", "valor1");
      await cache.close();
    });
  });
});
