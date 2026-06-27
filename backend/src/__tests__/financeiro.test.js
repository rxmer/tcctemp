import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import {
  criarContaPagar,
  listarContasPagar,
  atualizarContaPagar,
  deletarContaPagar,
  registrarPagamentoFaturamento,
  listarFaturamentos,
  resumoFinanceiro,
} from "../services/financeiro.service.js";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

const TENANT_ID = "tenant-1";

describe("financeiroService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarContaPagar", () => {
    it("deve criar conta com dados validos", async () => {
      const expected = { conta_id: 1, descricao: "Conta luz", valor: 200 };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await criarContaPagar({
        descricao: "Conta luz", valor: 200, data_vencimento: "2026-07-01", tenantId: TENANT_ID,
      });

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se descricao ausente", async () => {
      await expect(
        criarContaPagar({ valor: 200, data_vencimento: "2026-07-01", tenantId: TENANT_ID })
      ).rejects.toThrow("obrigatórios");
    });

    it("deve lancar erro se valor ausente", async () => {
      await expect(
        criarContaPagar({ descricao: "Teste", data_vencimento: "2026-07-01", tenantId: TENANT_ID })
      ).rejects.toThrow("obrigatórios");
    });

    it("deve lancar erro se data_vencimento ausente", async () => {
      await expect(
        criarContaPagar({ descricao: "Teste", valor: 100, tenantId: TENANT_ID })
      ).rejects.toThrow("obrigatórios");
    });

    it("deve lancar erro se insert falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        criarContaPagar({ descricao: "Teste", valor: 100, data_vencimento: "2026-07-01", tenantId: TENANT_ID })
      ).rejects.toThrow("Erro ao criar conta");
    });
  });

  describe("listarContasPagar", () => {
    it("deve listar contas do tenant", async () => {
      const expected = [{ conta_id: 1, descricao: "Conta luz" }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null, count: 1 }),
      }));

      const result = await listarContasPagar(TENANT_ID);

      expect(result.data).toEqual(expected);
      expect(result.total).toBe(1);
    });

    it("deve lancar erro se listar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error"), count: null }),
      }));

      await expect(listarContasPagar(TENANT_ID)).rejects.toThrow("Erro ao listar contas");
    });
  });

  describe("atualizarContaPagar", () => {
    it("deve atualizar conta", async () => {
      const expected = { conta_id: 1, descricao: "Atualizada" };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await atualizarContaPagar(1, TENANT_ID, { descricao: "Atualizada" });

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se update falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(atualizarContaPagar(1, TENANT_ID, {})).rejects.toThrow("Erro ao atualizar conta");
    });
  });

  describe("deletarContaPagar", () => {
    it("deve soft-deletar conta", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery());

      await deletarContaPagar(1, TENANT_ID);
    });

    it("deve lancar erro se delete falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(deletarContaPagar(1, TENANT_ID)).rejects.toThrow("Erro ao deletar conta");
    });
  });

  describe("registrarPagamentoFaturamento", () => {
    it("deve registrar pagamento", async () => {
      const expected = { faturamento_id: 1, pago: true };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await registrarPagamentoFaturamento(1, TENANT_ID, "2026-06-27");

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se pagamento falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(registrarPagamentoFaturamento(1, TENANT_ID)).rejects.toThrow("Erro ao registrar pagamento");
    });
  });

  describe("listarFaturamentos", () => {
    it("deve listar faturamentos", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null, count: 0 }),
      }));

      const result = await listarFaturamentos(TENANT_ID);

      expect(result.data).toEqual([]);
    });

    it("deve lancar erro se listar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error"), count: null }),
      }));

      await expect(listarFaturamentos(TENANT_ID)).rejects.toThrow("Erro ao listar faturamentos");
    });
  });

  describe("resumoFinanceiro", () => {
    it("deve calcular resumo com receitas e despesas", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockQuery({
            then: (resolve) => resolve({
              data: [
                { valor_total: 100, pago: true },
                { valor_total: 50, pago: false },
              ],
              error: null,
            }),
          });
        }
        return mockQuery({
          then: (resolve) => resolve({
            data: [
              { valor: 30, pago: true },
              { valor: 20, pago: false },
            ],
            error: null,
          }),
        });
      });

      const result = await resumoFinanceiro(TENANT_ID);

      expect(result.receitas.total).toBe(150);
      expect(result.receitas.recebido).toBe(100);
      expect(result.receitas.a_receber).toBe(50);
      expect(result.despesas.total).toBe(50);
      expect(result.despesas.pago).toBe(30);
      expect(result.despesas.a_pagar).toBe(20);
      expect(result.saldo).toBe(70);
    });

    it("deve lancar erro se receitas falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(resumoFinanceiro(TENANT_ID)).rejects.toThrow("Erro ao buscar receitas");
    });

    it("deve lancar erro se despesas falhar", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockQuery({
            then: (resolve) => resolve({ data: [], error: null }),
          });
        }
        return mockQuery({
          then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
        });
      });

      await expect(resumoFinanceiro(TENANT_ID)).rejects.toThrow("Erro ao buscar despesas");
    });
  });
});
