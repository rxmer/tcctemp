import { describe, it, expect, vi, beforeEach } from "vitest";
import * as servicosService from "../services/servicos.service.js";
import { supabaseAdmin } from "../config/supabase.js";

const TENANT_ID = "tenant-1";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("servicosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarServico", () => {
    it("deve criar servico com todos os campos", async () => {
      const expected = { servico_id: 1, nome_servico: "Lavagem" };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await servicosService.criarServico({
        nome_servico: "Lavagem", descricao: "Completa", preco_base: 50, duracao_min: 30, tenantId: TENANT_ID,
      });

      expect(result).toEqual(expected);
    });

    it("deve lancar AppError quando banco falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        servicosService.criarServico({ nome_servico: "X", preco_base: 10, duracao_min: 15, tenantId: TENANT_ID })
      ).rejects.toThrow("Erro ao criar serviço");
    });
  });

  describe("listarServicos", () => {
    it("deve listar servicos do tenant", async () => {
      const expected = [{ servico_id: 1, nome_servico: "Lavagem" }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null }),
      }));

      const result = await servicosService.listarServicos(TENANT_ID);

      expect(result.data).toEqual(expected);
    });

    it("deve lancar erro ao listar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(servicosService.listarServicos(TENANT_ID)).rejects.toThrow("Erro ao listar serviços");
    });
  });

  describe("atualizarServico", () => {
    it("deve atualizar servico", async () => {
      const expected = { servico_id: 1, nome_servico: "Premium" };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await servicosService.atualizarServico(1, TENANT_ID, { nome_servico: "Premium" });

      expect(result).toEqual(expected);
    });

    it("deve lancar erro ao atualizar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Update error") }),
      }));

      await expect(servicosService.atualizarServico(1, TENANT_ID, {})).rejects.toThrow("Erro ao atualizar serviço");
    });
  });

  describe("deletarServico", () => {
    it("deve soft-deletar servico", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery());

      await servicosService.deletarServico(1, TENANT_ID);
    });

    it("deve lancar erro ao deletar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("Delete error") }),
      }));

      await expect(servicosService.deletarServico(1, TENANT_ID)).rejects.toThrow("Erro ao deletar serviço");
    });
  });

  describe("toggleAtivoServico", () => {
    it("deve alternar ativo", async () => {
      let count = 0;
      supabaseAdmin.from.mockImplementation(() => {
        count++;
        return mockQuery({
          single: vi.fn().mockResolvedValue(
            count === 1
              ? { data: { ativo: true }, error: null }
              : { data: { ativo: false }, error: null }
          ),
        });
      });

      const result = await servicosService.toggleAtivoServico(1, TENANT_ID);

      expect(result).toEqual({ ativo: false });
    });

    it("deve lancar erro se fetch falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
      }));

      await expect(servicosService.toggleAtivoServico(999, TENANT_ID)).rejects.toThrow("Erro ao buscar serviço");
    });
  });
});
