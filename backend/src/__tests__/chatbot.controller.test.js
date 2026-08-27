import { describe, it, expect, vi } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import * as baileysClient from "../chatbot/baileys.client.js";
import * as chatbotService from "../chatbot/chatbot.service.js";
import { resetSession } from "../chatbot/chatbot.controller.js";

const TENANT_ID = "tenant-1";
const REMOTE_JID = "5511999999999@s.whatsapp.net";
const SESSION_ID = "sess-1";

vi.mock("../chatbot/baileys.client.js", () => ({
  setOnMessageHandler: vi.fn(),
  setOnOutgoingMessage: vi.fn(),
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
  getConnectionState: vi.fn().mockReturnValue({ status: "disconnected" }),
  startBaileys: vi.fn(),
  stopBaileys: vi.fn(),
}));

vi.mock("../chatbot/chatbot.session.js", () => ({
  listarSessoes: vi.fn(),
  contarNaoLidas: vi.fn(),
  listarMensagens: vi.fn(),
  registrarMensagemPorJid: vi.fn(),
}));

vi.mock("../chatbot/chatbot.service.js", () => ({
  processMessage: vi.fn(),
  sendMenu: vi.fn().mockResolvedValue(true),
}));

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

function buildSession(overrides = {}) {
  return {
    id: SESSION_ID,
    tenant_id: TENANT_ID,
    remote_jid: REMOTE_JID,
    client_phone: "11999999999",
    client_name: "João",
    state: "ESCOLHENDO_SERVICO",
    state_data: { servico_id: 1 },
    ...overrides,
  };
}

function mockRes() {
  const res = { json: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("chatbot.controller - resetSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve enviar a mensagem de reset e o menu", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery({
      single: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
    }));

    const req = { params: { id: SESSION_ID }, tenantId: TENANT_ID };
    const res = mockRes();
    await resetSession(req, res);

    expect(baileysClient.sendWhatsAppMessage).toHaveBeenCalledWith(
      REMOTE_JID,
      expect.stringContaining("Sessão reiniciada")
    );
    expect(chatbotService.sendMenu).toHaveBeenCalledWith(
      REMOTE_JID,
      expect.objectContaining({ id: SESSION_ID, state: "MENU_PRINCIPAL", state_data: {} })
    );
    expect(res.json).toHaveBeenCalledWith({ message: "Sessão reiniciada" });
  });

  it("deve responder 404 quando a sessao nao existe", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery({
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("não encontrada") }),
    }));

    const req = { params: { id: SESSION_ID }, tenantId: TENANT_ID };
    const res = mockRes();
    await resetSession(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(baileysClient.sendWhatsAppMessage).not.toHaveBeenCalled();
    expect(chatbotService.sendMenu).not.toHaveBeenCalled();
  });
});