import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import {
  criarNotificacao,
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  contarNaoLidas,
} from "../services/notificacoes.service.js";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

const TENANT_ID = "tenant-1";

describe("notificacoesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarNotificacao", () => {
    it("deve criar notificacao", async () => {
      const expected = { notificacao_id: 1, titulo: "Teste" };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await criarNotificacao({
        tenantId: TENANT_ID, tipo: "info", titulo: "Teste", mensagem: "Mensagem",
      });

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se criar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        criarNotificacao({ tenantId: TENANT_ID, tipo: "info", titulo: "Teste" })
      ).rejects.toThrow("Erro ao criar notificação");
    });
  });

  describe("listarNotificacoes", () => {
    it("deve listar notificacoes do tenant", async () => {
      const expected = [{ notificacao_id: 1, titulo: "Teste" }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null }),
      }));

      const result = await listarNotificacoes(TENANT_ID);

      expect(result).toEqual(expected);
    });

    it("deve filtrar por nao lidas", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      }));

      await listarNotificacoes(TENANT_ID, { apenasNaoLidas: true });

      expect(supabaseAdmin.from).toHaveBeenCalledWith("notificacoes");
    });

    it("deve lancar erro se listar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(listarNotificacoes(TENANT_ID)).rejects.toThrow("Erro ao listar notificações");
    });
  });

  describe("marcarComoLida", () => {
    it("deve marcar notificacao como lida", async () => {
      const expected = { notificacao_id: 1, lida: true };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await marcarComoLida(1, TENANT_ID);

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se marcar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(marcarComoLida(1, TENANT_ID)).rejects.toThrow("Erro ao marcar notificação como lida");
    });
  });

  describe("marcarTodasComoLidas", () => {
    it("deve marcar todas como lidas", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery());

      await marcarTodasComoLidas(TENANT_ID);
    });

    it("deve lancar erro se marcar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(marcarTodasComoLidas(TENANT_ID)).rejects.toThrow("Erro ao marcar notificações como lidas");
    });
  });

  describe("contarNaoLidas", () => {
    it("deve contar notificacoes nao lidas", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null, count: 5 }),
      }));

      const result = await contarNaoLidas(TENANT_ID);

      expect(result).toBe(5);
    });

    it("deve lancar erro se contar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error"), count: null }),
      }));

      await expect(contarNaoLidas(TENANT_ID)).rejects.toThrow("Erro ao contar notificações");
    });
  });
});
