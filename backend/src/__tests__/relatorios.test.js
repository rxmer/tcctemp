import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import {
  relatorioAgendamentos,
  relatorioServicos,
  relatorioFinanceiro,
  relatorioStatus,
  relatorioGeral,
} from "../services/relatorios.service.js";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

const TENANT_ID = "tenant-1";

describe("relatoriosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("relatorioAgendamentos", () => {
    it("deve agrupar por dia por padrao", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({
          data: [
            { agendamento_id: 1, data_agendamento: "2026-07-01", status: "pendente" },
            { agendamento_id: 2, data_agendamento: "2026-07-01", status: "confirmado" },
            { agendamento_id: 3, data_agendamento: "2026-07-02", status: "pendente" },
          ],
          error: null,
        }),
      }));

      const result = await relatorioAgendamentos(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].periodo).toBe("2026-07-01");
      expect(result[0].total).toBe(2);
      expect(result[0].por_status.pendente).toBe(1);
      expect(result[0].por_status.confirmado).toBe(1);
    });

    it("deve agrupar por mes", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({
          data: [
            { agendamento_id: 1, data_agendamento: "2026-07-01", status: "pendente" },
            { agendamento_id: 2, data_agendamento: "2026-07-15", status: "pendente" },
          ],
          error: null,
        }),
      }));

      const result = await relatorioAgendamentos(TENANT_ID, { agrupar_por: "mes" });

      expect(result).toHaveLength(1);
      expect(result[0].periodo).toBe("2026-07");
    });

    it("deve lancar erro se query falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(relatorioAgendamentos(TENANT_ID)).rejects.toThrow("Erro ao gerar relatório de agendamentos");
    });
  });

  describe("relatorioServicos", () => {
    it("deve calcular receita por servico", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({
          data: [
            { quantidade: 2, valor_unitario: 50, servico: { nome_servico: "Lavagem" } },
            { quantidade: 1, valor_unitario: 100, servico: { nome_servico: "Polimento" } },
          ],
          error: null,
        }),
      }));

      const result = await relatorioServicos(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].receita).toBe(100);
      expect(result[1].receita).toBe(100);
    });

    it("deve lancar erro se query falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(relatorioServicos(TENANT_ID)).rejects.toThrow("Erro ao gerar relatório de serviços");
    });
  });

  describe("relatorioFinanceiro", () => {
    it("deve calcular receitas e despesas por mes", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockQuery({
            then: (resolve) => resolve({
              data: [
                { criado_em: "2026-07-01T10:00:00", valor_total: 100, pago: true },
              ],
              error: null,
            }),
          });
        }
        return mockQuery({
          then: (resolve) => resolve({
            data: [
              { data_vencimento: "2026-07-15", valor: 30, pago: false },
            ],
            error: null,
          }),
        });
      });

      const result = await relatorioFinanceiro(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].receitas).toBe(100);
      expect(result[0].recebido).toBe(100);
      expect(result[0].despesas).toBe(30);
    });

    it("deve lancar erro se receitas falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(relatorioFinanceiro(TENANT_ID)).rejects.toThrow("Erro ao gerar relatório financeiro");
    });
  });

  describe("relatorioStatus", () => {
    it("deve contar agendamentos por status", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({
          data: [
            { status: "pendente" },
            { status: "pendente" },
            { status: "confirmado" },
          ],
          error: null,
        }),
      }));

      const result = await relatorioStatus(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.status === "pendente").quantidade).toBe(2);
      expect(result.find((r) => r.status === "confirmado").quantidade).toBe(1);
    });

    it("deve lancar erro se query falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(relatorioStatus(TENANT_ID)).rejects.toThrow("Erro ao gerar relatório de status");
    });
  });

  describe("relatorioGeral", () => {
    it("deve chamar todos os relatorios", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      }));

      const result = await relatorioGeral(TENANT_ID);

      expect(result).toHaveProperty("agendamentos");
      expect(result).toHaveProperty("servicos");
      expect(result).toHaveProperty("financeiro");
      expect(result).toHaveProperty("status");
    });
  });
});
