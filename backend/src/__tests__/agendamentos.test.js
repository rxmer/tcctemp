import { describe, it, expect, vi, beforeEach } from "vitest";
import * as agendamentoService from "../services/agendamentos.service.js";
import { supabaseAdmin } from "../config/supabase.js";

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null, count: 0 }),
    ...overrides,
  };
}

describe("agendamentoService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("criarAgendamento", () => {
    it("deve criar com sucesso", async () => {
      const expected = { agendamento_id: 1, data_agendamento: "2099-06-27", hora_agendamento: "09:00", status: "pendente", cliente: { nome: "João" } };
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        if (cc === 2) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) });
        if (cc === 3) return q({ single: vi.fn().mockResolvedValue({ data: { duracao_min: 30 }, error: null }) });
        if (cc === 4) return q();
        if (cc === 5) return q({ single: vi.fn().mockResolvedValue({ data: expected, error: null }) });
        if (cc === 6) { const q2 = q(); q2.then = (resolve) => resolve({ data: [], error: null }); return q2; }
        return q();
      });
      const r = await agendamentoService.criarAgendamento({ cliente_id: 1, veiculo_id: 1, servico_id: 1, data_agendamento: "2099-06-27", hora_agendamento: "09:00", tenantId: "t1", criadoPor: "u1" });
      expect(r.agendamento_id).toBe(1);
    });

    it("deve rejeitar sem expediente", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
      });
      await expect(agendamentoService.criarAgendamento({ cliente_id: 1, veiculo_id: 1, servico_id: 1, data_agendamento: "2099-06-27", hora_agendamento: "09:00", tenantId: "t1", criadoPor: "u1" })).rejects.toThrow("Não há expediente");
    });

    it("deve rejeitar horario fora expediente", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) });
      });
      await expect(agendamentoService.criarAgendamento({ cliente_id: 1, veiculo_id: 1, servico_id: 1, data_agendamento: "2099-06-27", hora_agendamento: "19:00", tenantId: "t1", criadoPor: "u1" })).rejects.toThrow("Horário fora do expediente");
    });

    it("deve rejeitar conflito de horario", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        if (cc === 2) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) });
        if (cc === 3) return q({ single: vi.fn().mockResolvedValue({ data: { duracao_min: 30 }, error: null }) });
        const q2 = q(); q2.then = (resolve) => resolve({ data: [{ hora_agendamento: "09:00", servico: { duracao_min: 30 } }], error: null, count: 0 }); return q2;
      });
      await expect(agendamentoService.criarAgendamento({ cliente_id: 1, veiculo_id: 1, servico_id: 1, data_agendamento: "2099-06-27", hora_agendamento: "09:00", tenantId: "t1", criadoPor: "u1" })).rejects.toThrow("conflita com outro agendamento");
    });

    it("deve rejeitar se insert falhar", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        if (cc === 2) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }) });
        if (cc === 3) return q({ single: vi.fn().mockResolvedValue({ data: { duracao_min: 30 }, error: null }) });
        if (cc === 4) return q();
        return q({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("Insert error") }) });
      });
      await expect(agendamentoService.criarAgendamento({ cliente_id: 1, veiculo_id: 1, servico_id: 1, data_agendamento: "2099-06-27", hora_agendamento: "09:00", tenantId: "t1", criadoPor: "u1" })).rejects.toThrow("Erro ao criar agendamento");
    });
  });

  describe("atualizarAgendamento", () => {
    it("deve permitir pendente->confirmado", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        return q({ single: vi.fn().mockResolvedValue(cc === 1 ? { data: { status: "pendente", data_agendamento: "2099-01-01", hora_agendamento: "10:00", servico_id: 1 }, error: null } : { data: { status: "confirmado", cliente: { nome: "João" } }, error: null }) });
      });
      expect((await agendamentoService.atualizarAgendamento(1, "t1", { status: "confirmado" })).status).toBe("confirmado");
    });

    it("deve rejeitar transicao invalida", async () => {
      supabaseAdmin.from.mockReturnValue(q({ single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: "2099-01-01", hora_agendamento: "10:00", servico_id: 1 }, error: null }) }));
      await expect(agendamentoService.atualizarAgendamento(1, "t1", { status: "finalizado" })).rejects.toThrow("Não é permitido mudar");
    });

    it("deve rejeitar cancelamento com menos de 2h", async () => {
      const s = new Date(Date.now() + 30 * 60000);
      const d = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,"0")}-${String(s.getDate()).padStart(2,"0")}`;
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: d, hora_agendamento: s.toTimeString().slice(0,5), servico_id: 1 }, error: null }) });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
      });
      await expect(agendamentoService.atualizarAgendamento(1, "t1", { status: "cancelado" })).rejects.toThrow("Cancelamento deve ter antecedência mínima de 2 horas");
    });

    it("deve permitir cancelamento com 3h", async () => {
      const s = new Date(Date.now() + 3 * 3600000);
      const d = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,"0")}-${String(s.getDate()).padStart(2,"0")}`;
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: d, hora_agendamento: s.toTimeString().slice(0,5), servico_id: 1 }, error: null }) });
        if (cc === 2) return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
        return q({ single: vi.fn().mockResolvedValue({ data: { status: "cancelado", cliente: { nome: "João" } }, error: null }) });
      });
      expect((await agendamentoService.atualizarAgendamento(1, "t1", { status: "cancelado" })).status).toBe("cancelado");
    });

    it("deve rejeitar reagendamento para data passada", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        return q({ single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: "2020-01-01", hora_agendamento: "10:00", servico_id: 1 }, error: null }) });
      });
      await expect(agendamentoService.atualizarAgendamento(1, "t1", { data_agendamento: "2020-01-01" })).rejects.toThrow("data passada");
    });
  });

  describe("deletarAgendamento", () => {
    it("deve soft-deletar", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        if (cc === 1) return q({ single: vi.fn().mockResolvedValue({ data: { status: "pendente" }, error: null }) });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
      });
      await agendamentoService.deletarAgendamento(1, "t1");
    });
  });
});
