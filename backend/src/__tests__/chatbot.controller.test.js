import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import { supabaseAdmin } from "../config/supabase.js";
import * as baileysClient from "../chatbot/baileys.client.js";
import * as chatbotService from "../chatbot/chatbot.service.js";
import * as sessionService from "../chatbot/chatbot.session.js";
import { resetSession, listSessions, getUnreadCount, connect, disconnect } from "../chatbot/chatbot.controller.js";

const TENANT_ID = "tenant-1";
const REMOTE_JID = "5511999999999@s.whatsapp.net";
const SESSION_ID = "sess-1";

vi.mock("../chatbot/baileys.client.js", () => ({
  setOnMessageHandler: vi.fn(),
  setOnOutgoingMessage: vi.fn(),
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
  getConnectionState: vi.fn().mockReturnValue({ status: "disconnected" }),
  startBaileys: vi.fn(),
  resetQrExpirationCount: vi.fn(),
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

describe("chatbot.controller - listSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baileysClient.getConnectionState.mockReturnValue({ status: "connected", tenantId: TENANT_ID });
  });

  it("retorna lista vazia e nao consulta sessoes quando WhatsApp desconectado", async () => {
    baileysClient.getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });

    const req = { tenantId: TENANT_ID, query: {} };
    const res = mockRes();

    await listSessions(req, res);

    expect(sessionService.listarSessoes).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ data: [], total: 0, conectado: false });
  });

  it("repassa parametros de paginacao, filtro e ordem", async () => {
    const resultado = { data: [buildSession()], total: 1 };
    sessionService.listarSessoes.mockResolvedValue(resultado);

    const req = {
      tenantId: TENANT_ID,
      query: { page: "2", limit: "10", ordem: "nome", estado: "atendente", busca: "João" },
    };
    const res = mockRes();

    await listSessions(req, res);

    expect(sessionService.listarSessoes).toHaveBeenCalledWith(TENANT_ID, {
      page: 2,
      limit: 10,
      ordem: "nome",
      estado: "atendente",
      busca: "João",
    });
    expect(res.json).toHaveBeenCalledWith(resultado);
  });

  it("usa valores padrao quando parametros ausentes", async () => {
    sessionService.listarSessoes.mockResolvedValue({ data: [], total: 0 });

    const req = { tenantId: TENANT_ID, query: {} };
    const res = mockRes();

    await listSessions(req, res);

    expect(sessionService.listarSessoes).toHaveBeenCalledWith(TENANT_ID, {
      page: 1,
      limit: 20,
      ordem: "recentes",
      estado: null,
      busca: "",
    });
  });
});

describe("chatbot.controller - connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia o Baileys e reseta o contador de expiração do QR", async () => {
    baileysClient.getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await connect(req, res);

    expect(baileysClient.resetQrExpirationCount).toHaveBeenCalled();
    expect(baileysClient.startBaileys).toHaveBeenCalledWith(TENANT_ID);
    expect(res.json).toHaveBeenCalledWith({ message: "Conectando..." });
  });

  it("recarrega o QR após expirar (qr_expired)", async () => {
    baileysClient.getConnectionState.mockReturnValue({ status: "qr_expired", tenantId: TENANT_ID });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await connect(req, res);

    expect(baileysClient.resetQrExpirationCount).toHaveBeenCalled();
    expect(baileysClient.startBaileys).toHaveBeenCalledWith(TENANT_ID);
    expect(res.json).toHaveBeenCalledWith({ message: "Conectando..." });
  });

  it("retorna mensagem quando já está conectado", async () => {
    baileysClient.getConnectionState.mockReturnValue({ status: "connected", tenantId: TENANT_ID });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await connect(req, res);

    expect(baileysClient.startBaileys).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Já conectado" });
  });
});

describe("chatbot.controller - disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("para o Baileys e mantém sessão salva por padrão", async () => {
    const req = { tenantId: TENANT_ID, query: {} };
    const res = mockRes();

    await disconnect(req, res);

    expect(baileysClient.stopBaileys).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Desconectado" });
  });

  it("apaga a sessão salva quando limpar=true", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const rmSyncSpy = vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

    const req = { tenantId: TENANT_ID, query: { limpar: "true" } };
    const res = mockRes();

    await disconnect(req, res);

    expect(baileysClient.stopBaileys).toHaveBeenCalled();
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining(`baileys_auth_${TENANT_ID}`));
    expect(rmSyncSpy).toHaveBeenCalledWith(expect.stringContaining(`baileys_auth_${TENANT_ID}`), {
      recursive: true,
      force: true,
    });
    expect(res.json).toHaveBeenCalledWith({ message: "Desconectado e sessão limpa" });

    rmSyncSpy.mockRestore();
    fs.existsSync.mockRestore();
  });

  it("não quebra quando limpar=true e a pasta não existe", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const req = { tenantId: TENANT_ID, query: { limpar: "true" } };
    const res = mockRes();

    await disconnect(req, res);

    expect(baileysClient.stopBaileys).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Desconectado e sessão limpa" });

    fs.existsSync.mockRestore();
  });
});

describe("chatbot.controller - getUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna zero sem consultar quando WhatsApp desconectado", async () => {
    baileysClient.getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await getUnreadCount(req, res);

    expect(sessionService.contarNaoLidas).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ total: 0, sessoes: [] });
  });

  it("retorna zero quando outro numero/tenant esta conectado", async () => {
    baileysClient.getConnectionState.mockReturnValue({ status: "connected", tenantId: "tenant-outro" });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await getUnreadCount(req, res);

    expect(sessionService.contarNaoLidas).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ total: 0, sessoes: [] });
  });

  it("retorna a contagem quando o numero do tenant esta conectado", async () => {
    const resultado = { total: 3, sessoes: [{ session_id: "sess-1", nao_lidas: 3 }] };
    sessionService.contarNaoLidas.mockResolvedValue(resultado);
    baileysClient.getConnectionState.mockReturnValue({ status: "connected", tenantId: TENANT_ID });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await getUnreadCount(req, res);

    expect(sessionService.contarNaoLidas).toHaveBeenCalledWith(TENANT_ID);
    expect(res.json).toHaveBeenCalledWith(resultado);
  });
});