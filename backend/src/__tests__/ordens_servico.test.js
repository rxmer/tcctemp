import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ordensServicoService from "../services/ordens_servico.service.js";
import { supabaseAdmin } from "../config/supabase.js";

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("ordensServicoService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("criarOS", () => {
    it("deve criar OS com sucesso", async () => {
      const ag = { agendamento_id: 1, status: "confirmado", servico_id: 10, servico: { nome_servico: "Troca", preco_base: 150 }, cliente: { nome: "João" }, veiculo: {} };
      const osC = { os_id: 1, agendamento_id: 1, observacoes: "teste", tenant_id: "t1" };
      const osF = { os_id: 1, status: "em_andamento", valor_total: 150, tenant_id: "t1", itens: [{ item_id: 1 }], faturamento: [], agendamento: { status: "em_andamento" } };
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: ag, error: null }) });
        if (cc === 2) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        if (cc === 3) return q({ single: vi.fn().mockResolvedValue({ data: osC, error: null }) });
        if (cc === 6) return q({ then: (r) => r({ data: [{ quantidade: 1, valor_unitario: 150 }], error: null }) });
        if (cc === 8) return q({ single: vi.fn().mockResolvedValue({ data: osF, error: null }) });
        if (cc === 9) return q({ single: vi.fn().mockResolvedValue({ data: osF, error: null }) });
        return q();
      });
      expect((await ordensServicoService.criarOS({ agendamento_id: 1, observacoes: "teste", tenantId: "t1" })).os_id).toBe(1);
    });

    it("deve rejeitar agendamento nao encontrado", async () => {
      supabaseAdmin.from.mockReturnValue(q({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }) }));
      await expect(ordensServicoService.criarOS({ agendamento_id: 999, observacoes: "", tenantId: "t1" })).rejects.toThrow("Agendamento não encontrado");
    });

    it("deve rejeitar se nao confirmado", async () => {
      supabaseAdmin.from.mockReturnValue(q({ single: vi.fn().mockResolvedValue({ data: { status: "pendente" }, error: null }) }));
      await expect(ordensServicoService.criarOS({ agendamento_id: 1, observacoes: "", tenantId: "t1" })).rejects.toThrow("Apenas agendamentos confirmados");
    });

    it("deve rejeitar OS duplicada", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { agendamento_id: 1, status: "confirmado" }, error: null }) });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { os_id: 99 }, error: null }) });
      });
      await expect(ordensServicoService.criarOS({ agendamento_id: 1, observacoes: "", tenantId: "t1" })).rejects.toThrow("Já existe uma ordem de serviço");
    });
  });

  describe("listarOS", () => {
    it("deve mapear itens e faturamento", async () => {
      supabaseAdmin.from.mockReturnValue(q({ then: (r) => r({ data: [{ os_id: 1, itens: [{ item_id: 1 }], faturamento: [{ f: 1 }] }], error: null }) }));
      expect((await ordensServicoService.listarOS("t1")).data[0].faturamento).toEqual({ f: 1 });
    });
  });

  describe("atualizarOS", () => {
    it("deve finalizar e criar faturamento", async () => {
      const resultData = { os_id: 1, status: "finalizado", valor_total: 200, itens: [], faturamento: [{ faturamento_id: 1, valor_total: 200 }] };
      const mockSingle = vi.fn();
      mockSingle
        .mockResolvedValueOnce({ data: { os_id: 1, status: "em_andamento", agendamento_id: 10, valor_total: 200 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValue({ data: resultData, error: null });

      const mockMaybe = vi.fn().mockResolvedValue({ data: null, error: null });

      supabaseAdmin.from.mockReturnValue(q({
        single: mockSingle,
        maybeSingle: mockMaybe,
        then: (r) => r({ data: [{ item_id: 1 }], error: null }),
      }));

      expect((await ordensServicoService.atualizarOS(1, "t1", { status: "finalizado" })).status).toBe("finalizado");
    });

    it("deve rejeitar finalizar sem itens", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, status: "em_andamento", agendamento_id: 10, valor_total: 0 }, error: null }) });
        return q({ then: (r) => r({ data: [], error: null }) });
      });
      await expect(ordensServicoService.atualizarOS(1, "t1", { status: "finalizado" })).rejects.toThrow("Não é possível finalizar uma OS sem itens");
    });

    it("deve cancelar e reabrir agendamento", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, status: "em_andamento", agendamento_id: 10 }, error: null }) });
        if (cc === 2) return q();
        return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, status: "cancelado", itens: [], faturamento: [] }, error: null }) });
      });
      expect((await ordensServicoService.atualizarOS(1, "t1", { status: "cancelado" })).status).toBe("cancelado");
    });
  });

  describe("deletarOS", () => {
    it("deve soft-deletar em andamento", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { status: "em_andamento" }, error: null }) });
        return q();
      });
      await ordensServicoService.deletarOS(1, "t1");
    });

    it("deve rejeitar excluir finalizada", async () => {
      supabaseAdmin.from.mockReturnValue(q({ single: vi.fn().mockResolvedValue({ data: { status: "finalizado" }, error: null }) }));
      await expect(ordensServicoService.deletarOS(1, "t1")).rejects.toThrow("Não é possível excluir uma OS finalizada");
    });
  });

  describe("adicionarItem", () => {
    it("deve adicionar e recalcular", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, status: "em_andamento" }, error: null }) });
        if (cc === 3) return q({ then: (r) => r({ data: [{ quantidade: 2, valor_unitario: 50 }], error: null }) });
        if (cc === 5) return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, valor_total: 100, itens: [], faturamento: [] }, error: null }) });
        return q();
      });
      expect((await ordensServicoService.adicionarItem(1, "t1", { descricao: "X", quantidade: 2, valor_unitario: 50 })).valor_total).toBe(100);
    });
  });

  describe("buscarOSCompleta", () => {
    it("deve retornar OS com itens e faturamento", async () => {
      supabaseAdmin.from.mockReturnValue(q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, itens: [{ i: 1 }], faturamento: [{ f: 1 }] }, error: null }) }));
      expect((await ordensServicoService.buscarOSCompleta(1, "t1")).faturamento).toEqual({ f: 1 });
    });
  });
});
