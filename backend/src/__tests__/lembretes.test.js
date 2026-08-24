import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";

vi.mock("../chatbot/baileys.client.js", () => ({
  sendWhatsAppMessage: vi.fn(),
  getConnectionState: vi.fn(),
}));

vi.mock("../services/notificacoes.service.js", () => ({
  criarNotificacao: vi.fn().mockResolvedValue({}),
}));

import * as baileys from "../chatbot/baileys.client.js";
import * as notificacoes from "../services/notificacoes.service.js";
import { verificarEEnviarLembretes } from "../services/lembretes.service.js";
import { dataLocalISO } from "../utils/data.js";

const TENANT_ID = "tenant-1";

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

function agendamentoDeAqui30Min(overrides = {}) {
  const alvo = new Date(Date.now() + 30 * 60 * 1000);
  const hora = `${String(alvo.getHours()).padStart(2, "0")}:${String(alvo.getMinutes()).padStart(2, "0")}`;
  return {
    agendamento_id: 10,
    tenant_id: TENANT_ID,
    data_agendamento: dataLocalISO(alvo),
    hora_agendamento: `${hora}:00`,
    lembrete_enviado: null,
    lembrete_tentativas: 0,
    status: "confirmado",
    cliente: { nome: "Maria", telefone: "11988887777" },
    ...overrides,
  };
}

describe("lembretes - verificarEEnviarLembretes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baileys.getConnectionState.mockReturnValue({ status: "connected", tenantId: TENANT_ID });
  });

  it("envia lembrete e registra sucesso", async () => {
    const ag = agendamentoDeAqui30Min();
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos" && !ag._update) {
        return q({ then: (resolve) => resolve({ data: [ag], error: null }) });
      }
      if (table === "chatbot_session") {
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { remote_jid: "11988887777@s.whatsapp.net" }, error: null }) });
      }
      return q();
    });
    baileys.sendWhatsAppMessage.mockResolvedValue();

    await verificarEEnviarLembretes();

    expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
      "11988887777@s.whatsapp.net",
      expect.stringContaining("Lembrete de Agendamento")
    );
    const updateMock = supabaseAdmin.from.mock.results.at(-1).value;
    expect(updateMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ lembrete_enviado: expect.any(String), lembrete_tentativas: 0 })
    );
  });

  it("notifica o estabelecimento apos esgotar as tentativas", async () => {
    const ag = agendamentoDeAqui30Min({ lembrete_tentativas: 2 });
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos") {
        return q({ then: (resolve) => resolve({ data: [ag], error: null }) });
      }
      if (table === "chatbot_session") {
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { remote_jid: "11988887777@s.whatsapp.net" }, error: null }) });
      }
      return q();
    });
    baileys.sendWhatsAppMessage.mockRejectedValue(new Error("socket fechado"));

    await verificarEEnviarLembretes();

    await new Promise((r) => setImmediate(r));

    expect(notificacoes.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        tipo: "lembrete_falha",
        titulo: "Lembrete não entregue",
        referenciaTipo: "agendamento",
        referenciaId: "10",
      })
    );
    const chamada = notificacoes.criarNotificacao.mock.calls[0][0];
    expect(chamada.mensagem).toContain("Maria");
  });

  it("nao envia quando whatsapp nao esta conectado", async () => {
    baileys.getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });

    await verificarEEnviarLembretes();

    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    expect(baileys.sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("envia por telefone direto quando nao ha sessao de chatbot", async () => {
    const ag = agendamentoDeAqui30Min();
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos") {
        return q({ then: (resolve) => resolve({ data: [ag], error: null }) });
      }
      return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
    });
    baileys.sendWhatsAppMessage.mockResolvedValue();

    await verificarEEnviarLembretes();

    expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
      "5511988887777@s.whatsapp.net",
      expect.stringContaining("Lembrete de Agendamento")
    );
  });

  it("continua para o proximo cliente sem telefone cadastrado", async () => {
    const ag = agendamentoDeAqui30Min({ cliente: { nome: "Joao", telefone: null } });
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos") {
        return q({ then: (resolve) => resolve({ data: [ag], error: null }) });
      }
      return q();
    });

    await verificarEEnviarLembretes();

    expect(baileys.sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});
