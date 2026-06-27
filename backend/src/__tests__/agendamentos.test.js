import { describe, it, expect, vi, beforeEach } from "vitest";
import * as agendamentoService from "../services/agendamentos.service.js";
import { supabaseAdmin } from "../config/supabase.js";
import "../config/supabase.js";

function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("agendamentoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarAgendamento", () => {
    it("deve criar agendamento com sucesso", async () => {
      const expected = {
        agendamento_id: 1, data_agendamento: "2026-06-27", hora_agendamento: "09:00",
        status: "pendente", cliente: { nome: "João" },
      };
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) });
        }
        return q({ single: vi.fn().mockResolvedValue({ data: expected, error: null }) });
      });

      const result = await agendamentoService.criarAgendamento({
        cliente_id: 1, veiculo_id: 1, servico_id: 1,
        data_agendamento: "2026-06-27", hora_agendamento: "09:00",
        observacoes: "Teste", tenantId: "t1", criadoPor: "u1",
      });

      expect(result.agendamento_id).toBe(1);
    });

    it("deve rejeitar se nao houver expediente", async () => {
      supabaseAdmin.from.mockReturnValue(q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }));

      await expect(
        agendamentoService.criarAgendamento({
          cliente_id: 1, veiculo_id: 1, servico_id: 1,
          data_agendamento: "2026-06-27", hora_agendamento: "09:00",
          tenantId: "t1", criadoPor: "u1",
        })
      ).rejects.toThrow("Não há expediente neste dia da semana");
    });

    it("deve rejeitar horario fora do expediente", async () => {
      supabaseAdmin.from.mockReturnValue(q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) }));

      await expect(
        agendamentoService.criarAgendamento({
          cliente_id: 1, veiculo_id: 1, servico_id: 1,
          data_agendamento: "2026-06-27", hora_agendamento: "19:00",
          tenantId: "t1", criadoPor: "u1",
        })
      ).rejects.toThrow("Horário fora do expediente");
    });

    it("deve rejeitar conflito de horario", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) });
        }
        const query = q();
        query.then = (resolve) => resolve({ data: [], count: 1, error: null });
        return query;
      });

      await expect(
        agendamentoService.criarAgendamento({
          cliente_id: 1, veiculo_id: 1, servico_id: 1,
          data_agendamento: "2026-06-27", hora_agendamento: "09:00",
          tenantId: "t1", criadoPor: "u1",
        })
      ).rejects.toThrow("Já existe um agendamento neste horário");
    });

    it("deve rejeitar se insert falhar", async () => {
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          const query = q();
          if (callCount === 1) {
            query.maybeSingle = vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null });
          }
          query.then = (resolve) => resolve({ data: [], count: 0, error: null });
          return query;
        }
        return q({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("Insert error") }) });
      });

      await expect(
        agendamentoService.criarAgendamento({
          cliente_id: 1, veiculo_id: 1, servico_id: 1,
          data_agendamento: "2026-06-27", hora_agendamento: "09:00",
          tenantId: "t1", criadoPor: "u1",
        })
      ).rejects.toThrow("Erro ao criar agendamento");
    });
  });

  describe("listarAgendamentos", () => {
    it("deve listar sem filtros", async () => {
      const expected = [{ agendamento_id: 1 }];
      supabaseAdmin.from.mockReturnValue(q({ then: (resolve) => resolve({ data: expected, error: null }) }));

      const result = await agendamentoService.listarAgendamentos("t1");

      expect(result.data).toEqual(expected);
    });

    it("deve aplicar filtro de status", async () => {
      supabaseAdmin.from.mockReturnValue(q({ then: (resolve) => resolve({ data: [], error: null }) }));

      await agendamentoService.listarAgendamentos("t1", { status: "confirmado" });

      expect(supabaseAdmin.from.mock.results[0].value.eq).toHaveBeenCalledWith("status", "confirmado");
    });
  });

  describe("atualizarAgendamento", () => {
    it("deve permitir pendente->confirmado", async () => {
      const expected = { status: "confirmado", cliente: { nome: "João" } };
      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        return q({
          single: vi.fn().mockResolvedValue(
            callCount === 1
              ? { data: { status: "pendente", data_agendamento: "2099-01-01", hora_agendamento: "10:00" }, error: null }
              : { data: expected, error: null }
          ),
        });
      });

      const result = await agendamentoService.atualizarAgendamento(1, "t1", { status: "confirmado" });

      expect(result.status).toBe("confirmado");
    });

    it("deve rejeitar transicao invalida", async () => {
      supabaseAdmin.from.mockReturnValue(q({
        single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: "2099-01-01", hora_agendamento: "10:00" }, error: null }),
      }));

      await expect(
        agendamentoService.atualizarAgendamento(1, "t1", { status: "finalizado" })
      ).rejects.toThrow("Não é permitido mudar");
    });

    it("deve rejeitar cancelamento com menos de 2h", async () => {
      const soon = new Date(Date.now() + 30 * 60 * 1000);
      const data = toLocalDate(soon);
      const hora = soon.toTimeString().slice(0, 5);

      supabaseAdmin.from.mockReturnValue(q({
        single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: data, hora_agendamento: hora }, error: null }),
      }));

      await expect(
        agendamentoService.atualizarAgendamento(1, "t1", { status: "cancelado" })
      ).rejects.toThrow("Cancelamento deve ter antecedência mínima de 2 horas");
    });

    it("deve permitir cancelamento com 3h de antecedencia", async () => {
      const future = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const data = toLocalDate(future);
      const hora = future.toTimeString().slice(0, 5);

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        return q({
          single: vi.fn().mockResolvedValue(
            callCount === 1
              ? { data: { status: "pendente", data_agendamento: data, hora_agendamento: hora }, error: null }
              : { data: { status: "cancelado", cliente: { nome: "João" } }, error: null }
          ),
        });
      });

      const result = await agendamentoService.atualizarAgendamento(1, "t1", { status: "cancelado" });

      expect(result.status).toBe("cancelado");
    });
  });

  describe("deletarAgendamento", () => {
    it("deve soft-deletar agendamento", async () => {
      supabaseAdmin.from.mockReturnValue(q());

      await agendamentoService.deletarAgendamento(1, "t1");
    });
  });
});
