import { describe, it, expect, vi, beforeEach } from "vitest";
import * as veiculosService from "../services/veiculos.service.js";
import { supabaseAdmin } from "../config/supabase.js";

const TENANT_ID = "tenant-1";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
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

describe("veiculosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarVeiculo", () => {
    it("deve lancar 409 se placa ja existir", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { veiculo_id: 1 }, error: null }),
      }));

      await expect(
        veiculosService.criarVeiculo({ placa: "ABC1234", marca: "Fiat", modelo: "Uno", cliente_id: 1, tenantId: TENANT_ID })
      ).rejects.toThrow("Já existe um veículo com esta placa");
    });

    it("deve criar veiculo convertendo placa para uppercase", async () => {
      const expected = { veiculo_id: 1, placa: "ABC1234" };
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await veiculosService.criarVeiculo({
        placa: "abc1234", marca: "Fiat", modelo: "Uno", cliente_id: 1, tenantId: TENANT_ID,
      });

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se insert falhar", async () => {
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Insert error") }),
      }));

      await expect(
        veiculosService.criarVeiculo({ placa: "XYZ9876", marca: "VW", modelo: "Gol", cliente_id: 1, tenantId: TENANT_ID })
      ).rejects.toThrow("Erro ao criar veículo");
    });
  });

  describe("listarVeiculos", () => {
    it("deve listar veiculos do tenant", async () => {
      const expected = [{ veiculo_id: 1, placa: "ABC1234" }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null }),
      }));

      const result = await veiculosService.listarVeiculos(TENANT_ID);

      expect(result.data).toEqual(expected);
    });
  });

  describe("atualizarVeiculo", () => {
    it("deve verificar placa duplicada excluindo proprio id", async () => {
      const expected = { veiculo_id: 1, placa: "NEW1234" };
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await veiculosService.atualizarVeiculo(1, TENANT_ID, { placa: "NEW1234" });

      expect(result.placa).toBe("NEW1234");
    });

    it("deve lancar 409 se placa pertencer a outro veiculo", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { veiculo_id: 2 }, error: null }),
      }));

      await expect(
        veiculosService.atualizarVeiculo(1, TENANT_ID, { placa: "USED1234" })
      ).rejects.toThrow("Já existe outro veículo com esta placa");
    });
  });

  describe("deletarVeiculo", () => {
    it("deve soft-deletar veiculo", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        const q = mockQuery();
        q.then = (resolve) => resolve({ data: [], error: null, count: 0 });
        if (cc === 1) return q;
        return mockQuery();
      });

      await veiculosService.deletarVeiculo(1, TENANT_ID);
    });
  });
});
