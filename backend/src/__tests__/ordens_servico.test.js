import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ordensServicoService from "../services/ordens_servico.service.js";
import { supabaseAdmin } from "../config/supabase.js";

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("ordensServicoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarOS", () => {
    it("deve criar OS com sucesso a partir de agendamento confirmado", async () => {
      const agendamento = {
        agendamento_id: 1,
        status: "confirmado",
        servico_id: 10,
        servico: { nome_servico: "Troca de óleo", preco_base: 150 },
        cliente: { nome: "João" },
        veiculo: { veiculo_id: 1, placa: "ABC-1234" },
      };
      const osCriada = { os_id: 1, agendamento_id: 1, observacoes: "teste", tenant_id: "t1" };
      const osCompleta = {
        os_id: 1,
        agendamento_id: 1,
        observacoes: "teste",
        status: "em_andamento",
        valor_total: 150,
        tenant_id: "t1",
        itens: [
          { item_id: 1, servico_id: 10, descricao: "Troca de óleo", quantidade: 1, valor_unitario: 150, servico: { nome_servico: "Troca de óleo" } },
        ],
        faturamento: [],
        agendamento: {
          agendamento_id: 1,
          status: "em_andamento",
          cliente: { nome: "João" },
          veiculo: { placa: "ABC-1234" },
        },
      };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: agendamento, error: null }) });
        }
        if (callCount === 2) {
          return q({ single: vi.fn().mockResolvedValue({ data: osCriada, error: null }) });
        }
        if (callCount === 3) {
          return q();
        }
        if (callCount === 4) {
          return q();
        }
        if (callCount === 5) {
          return q({ then: (resolve) => resolve({ data: [{ quantidade: 1, valor_unitario: 150 }], error: null }) });
        }
        if (callCount === 6) {
          return q();
        }
        if (callCount === 7) {
          return q({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) });
        }
        return q({ single: vi.fn().mockResolvedValue({ data: osCompleta, error: null }) });
      });

      const result = await ordensServicoService.criarOS({
        agendamento_id: 1,
        observacoes: "teste",
        tenantId: "t1",
      });

      expect(result.os_id).toBe(1);
      expect(result.status).toBe("em_andamento");
      expect(result.valor_total).toBe(150);
      expect(result.itens).toHaveLength(1);
    });

    it("deve lançar 404 se agendamento não existir", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }) })
      );

      await expect(
        ordensServicoService.criarOS({ agendamento_id: 999, observacoes: "", tenantId: "t1" })
      ).rejects.toMatchObject({ message: "Agendamento não encontrado", statusCode: 404 });
    });

    it("deve lançar erro se agendamento não estiver confirmado", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: { agendamento_id: 1, status: "pendente" }, error: null }) })
      );

      await expect(
        ordensServicoService.criarOS({ agendamento_id: 1, observacoes: "", tenantId: "t1" })
      ).rejects.toThrow("Apenas agendamentos confirmados podem virar ordem de serviço");
    });
  });

  describe("listarOS", () => {
    it("deve listar OSs com itens e faturamento mapeados", async () => {
      const data = [
        { os_id: 1, itens: [{ item_id: 1 }], faturamento: [{ faturamento_id: 1 }] },
        { os_id: 2, itens: null, faturamento: [] },
      ];

      supabaseAdmin.from.mockReturnValue(q({ then: (resolve) => resolve({ data, error: null }) }));

      const result = await ordensServicoService.listarOS("t1");

      expect(result.data).toHaveLength(2);
      expect(result.data[0].itens).toEqual([{ item_id: 1 }]);
      expect(result.data[0].faturamento).toEqual({ faturamento_id: 1 });
      expect(result.data[1].itens).toEqual([]);
      expect(result.data[1].faturamento).toBeNull();
    });

    it("deve aplicar filtro de status", async () => {
      supabaseAdmin.from.mockReturnValue(q({ then: (resolve) => resolve({ data: [], error: null }) }));

      await ordensServicoService.listarOS("t1", { status: "em_andamento" });

      expect(supabaseAdmin.from.mock.results[0].value.eq).toHaveBeenCalledWith("status", "em_andamento");
    });
  });

  describe("atualizarOS", () => {
    it("deve finalizar OS e criar faturamento quando status=finalizado", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, valor_total: 200 }, error: null }) });
        }
        if (callCount === 2) {
          return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        }
        if (callCount === 3) {
          return q();
        }
        if (callCount === 4) {
          return q({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) });
        }
        if (callCount === 5) {
          return q();
        }
        return q({
          single: vi.fn().mockResolvedValue({
            data: { os_id: 1, status: "finalizado", valor_total: 200, itens: [], faturamento: [{ faturamento_id: 1, valor_total: 200 }] },
            error: null,
          }),
        });
      });

      const result = await ordensServicoService.atualizarOS(1, "t1", { status: "finalizado" });
      expect(result.status).toBe("finalizado");
      expect(result.faturamento.valor_total).toBe(200);
    });

    it("deve cancelar OS e reabrir agendamento quando status=cancelado", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) });
        }
        if (callCount === 2) {
          return q({ single: vi.fn().mockResolvedValue({ data: { agendamento_id: 10 }, error: null }) });
        }
        if (callCount === 3) {
          return q();
        }
        if (callCount === 4) {
          return q();
        }
        return q({
          single: vi.fn().mockResolvedValue({
            data: { os_id: 1, status: "cancelado", itens: [], faturamento: [] },
            error: null,
          }),
        });
      });

      const result = await ordensServicoService.atualizarOS(1, "t1", { status: "cancelado" });
      expect(result.status).toBe("cancelado");
    });

    it("deve atualizar OS sem side effects para status genérico", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q();
        }
        return q({
          single: vi.fn().mockResolvedValue({
            data: { os_id: 1, status: "em_andamento", observacoes: "Nova obs", itens: [], faturamento: [] },
            error: null,
          }),
        });
      });

      const result = await ordensServicoService.atualizarOS(1, "t1", { observacoes: "Nova obs" });
      expect(result.status).toBe("em_andamento");
      expect(result.observacoes).toBe("Nova obs");
    });

    it("deve pular criação de faturamento se já existir", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, valor_total: 200 }, error: null }) });
        }
        if (callCount === 2) {
          return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { faturamento_id: 99 }, error: null }) });
        }
        if (callCount === 3) {
          return q();
        }
        return q({
          single: vi.fn().mockResolvedValue({
            data: { os_id: 1, status: "finalizado", valor_total: 200, itens: [], faturamento: [{ faturamento_id: 99 }] },
            error: null,
          }),
        });
      });

      const result = await ordensServicoService.atualizarOS(1, "t1", { status: "finalizado" });
      expect(result.status).toBe("finalizado");
      expect(result.faturamento.faturamento_id).toBe(99);
    });
  });

  describe("deletarOS", () => {
    it("deve soft-deletar OS", async () => {
      supabaseAdmin.from.mockReturnValue(q());

      await ordensServicoService.deletarOS(1, "t1");

      expect(supabaseAdmin.from).toHaveBeenCalledWith("ordens_servico");
      expect(supabaseAdmin.from.mock.results[0].value.update).toHaveBeenCalledWith({ deletado_em: expect.any(String) });
    });
  });

  describe("adicionarItem", () => {
    it("deve adicionar item e recalcular total", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, status: "em_andamento" }, error: null }) });
        }
        if (callCount === 2) {
          return q();
        }
        if (callCount === 3) {
          return q({ then: (resolve) => resolve({ data: [{ quantidade: 2, valor_unitario: 50 }], error: null }) });
        }
        if (callCount === 4) {
          return q();
        }
        return q({
          single: vi.fn().mockResolvedValue({
            data: { os_id: 1, status: "em_andamento", valor_total: 100, itens: [{ item_id: 2, descricao: "Item extra", quantidade: 2, valor_unitario: 50 }], faturamento: [] },
            error: null,
          }),
        });
      });

      const result = await ordensServicoService.adicionarItem(1, "t1", {
        servico_id: 20, descricao: "Item extra", quantidade: 2, valor_unitario: 50,
      });

      expect(result.valor_total).toBe(100);
    });

    it("deve lançar 400 se campos obrigatórios faltarem", async () => {
      await expect(
        ordensServicoService.adicionarItem(1, "t1", { servico_id: 20 })
      ).rejects.toMatchObject({ message: "Descrição, quantidade e valor unitário são obrigatórios", statusCode: 400 });
    });

    it("deve lançar 404 se OS não existir", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })
      );

      await expect(
        ordensServicoService.adicionarItem(1, "t1", { descricao: "Teste", quantidade: 1, valor_unitario: 10 })
      ).rejects.toThrow("OS não encontrada");
    });

    it("deve lançar 400 se OS não estiver em andamento", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, status: "finalizado" }, error: null }) })
      );

      await expect(
        ordensServicoService.adicionarItem(1, "t1", { descricao: "Teste", quantidade: 1, valor_unitario: 10 })
      ).rejects.toThrow("Só é possível adicionar itens em OS em andamento");
    });
  });

  describe("removerItem", () => {
    it("deve remover item e recalcular total", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q();
        }
        if (callCount === 2) {
          return q({ then: (resolve) => resolve({ data: [], error: null }) });
        }
        if (callCount === 3) {
          return q();
        }
        return q({
          single: vi.fn().mockResolvedValue({
            data: { os_id: 1, status: "em_andamento", valor_total: 0, itens: [], faturamento: [] },
            error: null,
          }),
        });
      });

      const result = await ordensServicoService.removerItem(1, 5, "t1");
      expect(result.valor_total).toBe(0);
    });
  });

  describe("buscarOSCompleta", () => {
    it("deve retornar OS com itens e faturamento mapeados", async () => {
      const osData = {
        os_id: 1,
        itens: [{ item_id: 1 }],
        faturamento: [{ faturamento_id: 1 }],
      };

      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: osData, error: null }) })
      );

      const result = await ordensServicoService.buscarOSCompleta(1, "t1");

      expect(result.itens).toEqual([{ item_id: 1 }]);
      expect(result.faturamento).toEqual({ faturamento_id: 1 });
    });

    it("deve usar default para itens null e faturamento vazio", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: { os_id: 1, itens: null, faturamento: [] }, error: null }) })
      );

      const result = await ordensServicoService.buscarOSCompleta(1, "t1");

      expect(result.itens).toEqual([]);
      expect(result.faturamento).toBeNull();
    });

    it("deve lançar 404 se OS não existir", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }) })
      );

      await expect(
        ordensServicoService.buscarOSCompleta(999, "t1")
      ).rejects.toMatchObject({ message: "OS não encontrada", statusCode: 404 });
    });
  });
});
