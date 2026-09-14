import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import { supabaseAdmin } from "../config/supabase.js";
import * as baileysClient from "../chatbot/baileys.client.js";
import * as chatbotService from "../chatbot/chatbot.service.js";
import * as sessionService from "../chatbot/chatbot.session.js";
import { resetSession, listSessions, getUnreadCount, connect, disconnect, sendReplyAudio } from "../chatbot/chatbot.controller.js";

const TENANT_ID = "tenant-1";
const REMOTE_JID = "5511999999999@s.whatsapp.net";
const SESSION_ID = "sess-1";

vi.mock("../chatbot/baileys.client.js", () => ({
  setOnMessageHandler: vi.fn(),
  setOnMediaMessageHandler: vi.fn(),
  setOnOutgoingMessage: vi.fn(),
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
  sendWhatsAppAudio: vi.fn().mockResolvedValue(true),
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
  registrarMensagem: vi.fn().mockResolvedValue(true),
}));

vi.mock("../chatbot/chatbot.service.js", () => ({
  processMessage: vi.fn(),
  processAudioMessage: vi.fn(),
  sendMenu: vi.fn().mockResolvedValue(true),
}));

vi.mock("../chatbot/chatbot.media.js", () => ({
  salvarAudio: vi.fn().mockResolvedValue("tenant/sess/audio-1.ogg"),
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
    baileysClient.getConnectionState.mockReturnValue({ status: "connected", tenantId: TENANT_ID, phoneNumber: "18999999999" });
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
      numeroOrigem: "18999999999",
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
      numeroOrigem: "18999999999",
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
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const req = { tenantId: TENANT_ID, query: {} };
    const res = mockRes();

    await disconnect(req, res);

    expect(baileysClient.stopBaileys).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Desconectado e sessão limpa" });

    fs.existsSync.mockRestore();
  });

  it("apaga a sessão salva ao desconectar", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const rmSyncSpy = vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

    const req = { tenantId: TENANT_ID, query: {} };
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

  it("não quebra quando a pasta não existe", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const req = { tenantId: TENANT_ID, query: {} };
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
    baileysClient.getConnectionState.mockReturnValue({ status: "connected", tenantId: TENANT_ID, phoneNumber: "18999999999" });

    const req = { tenantId: TENANT_ID };
    const res = mockRes();

    await getUnreadCount(req, res);

    expect(sessionService.contarNaoLidas).toHaveBeenCalledWith(TENANT_ID, "18999999999");
    expect(res.json).toHaveBeenCalledWith(resultado);
  });
});

describe("chatbot.controller - sendReplyAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildReq(overrides = {}) {
    return {
      params: { id: SESSION_ID },
      tenantId: TENANT_ID,
      file: {
        buffer: Buffer.from("fake-audio-bytes"),
        mimetype: "audio/ogg; codecs=opus",
        size: 15,
      },
      ...overrides,
    };
  }

  it("envia o áudio, salva no storage e registra no histórico", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery({
      single: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
    }));
    const { salvarAudio } = await import("../chatbot/chatbot.media.js");

    const req = buildReq();
    const res = mockRes();
    await sendReplyAudio(req, res);

    expect(salvarAudio).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      sessionId: SESSION_ID,
      buffer: req.file.buffer,
      mimetype: "audio/ogg; codecs=opus",
    });
    expect(baileysClient.sendWhatsAppAudio).toHaveBeenCalledWith(
      REMOTE_JID,
      req.file.buffer,
      "audio/ogg; codecs=opus",
      TENANT_ID
    );
    expect(sessionService.registrarMensagem).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      sessionId: SESSION_ID,
      remetente: "atendente",
      texto: expect.stringContaining("Áudio"),
      tipoMedia: "audio",
      mediaUrl: "tenant/sess/audio-1.ogg",
    });
    expect(res.json).toHaveBeenCalledWith({ message: "Áudio enviado" });
  });

  it("responde 400 quando o arquivo não é enviado", async () => {
    const req = buildReq({ file: null });
    const res = mockRes();
    await sendReplyAudio(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(baileysClient.sendWhatsAppAudio).not.toHaveBeenCalled();
  });

  it("rejeita arquivos que não são de áudio", async () => {
    const req = buildReq({ file: { buffer: Buffer.from("x"), mimetype: "application/pdf", size: 1 } });
    const res = mockRes();
    await sendReplyAudio(req, res);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(baileysClient.sendWhatsAppAudio).not.toHaveBeenCalled();
  });

  it("responde 404 quando a sessão não existe", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery({
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("não encontrada") }),
    }));

    const req = buildReq();
    const res = mockRes();
    await sendReplyAudio(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(baileysClient.sendWhatsAppAudio).not.toHaveBeenCalled();
  });
});