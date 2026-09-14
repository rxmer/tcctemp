import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../services/notificacoes.service.js", () => ({
  criarNotificacao: vi.fn().mockResolvedValue({}),
}));

var qrListeners;

vi.mock("./encrypted-auth-state.js", () => ({
  useEncryptedMultiFileAuthState: vi.fn().mockResolvedValue({
    state: { creds: {}, keys: {} },
    saveCreds: vi.fn(),
  }),
}));

vi.mock("@whiskeysockets/baileys", () => {
  const listeners = {};
  const socket = {
    ev: { on: vi.fn((evt, fn) => { listeners[evt] = fn; }) },
    ws: { close: vi.fn() },
    end: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({}),
    updateMediaMessage: vi.fn().mockResolvedValue({}),
    user: { id: "5511999999999:15@s.whatsapp.net" },
  };
  qrListeners = listeners;
  return {
    default: vi.fn(() => socket),
    DisconnectReason: { loggedOut: 401, timedOut: 408, connectionClosed: 428, connectionReplaced: 440 },
    makeCacheableSignalKeyStore: vi.fn((keys) => keys),
    downloadMediaMessage: vi.fn().mockResolvedValue(Buffer.from([1, 2, 3, 4])),
  };
});

import {
  normalizarNumero,
  ehNumeroProprio,
  startBaileys,
  stopBaileys,
  getConnectionState,
  sendWhatsAppAudio,
  setOnMediaMessageHandler,
} from "../chatbot/baileys.client.js";

const QR_TENANT_ID = "tenant-qrflow";

async function emitirEventoQr(evento) {
  const handler = qrListeners["connection.update"];
  await handler(evento);
}

function handlerQr() {
  return qrListeners["connection.update"];
}

describe("normalizarNumero", () => {
  it("extrai o numero de um jid comum", () => {
    expect(normalizarNumero("5511999999999@s.whatsapp.net")).toBe("11999999999");
  });

  it("extrai o numero de um jid com device (:porta)", () => {
    expect(normalizarNumero("5511999999999:15@s.whatsapp.net")).toBe("11999999999");
  });

  it("nao remove o DDI quando nao ha DDI (ex.: jid sem pais)", () => {
    expect(normalizarNumero("1199999999@s.whatsapp.net")).toBe("1199999999");
  });

  it("retorna null para entradas vazias", () => {
    expect(normalizarNumero(null)).toBeNull();
    expect(normalizarNumero(undefined)).toBeNull();
    expect(normalizarNumero("")).toBeNull();
  });

  it("extrai numero de um jid @lid (sem mapping retorna o token cru)", () => {
    const numero = normalizarNumero("38912345678@lid");
    expect(numero).toBe("38912345678");
  });
});

describe("ehNumeroProprio", () => {
  it("retorna true quando o remetente e o proprio numero conectado", () => {
    expect(ehNumeroProprio("5511999999999@s.whatsapp.net", "11999999999")).toBe(true);
  });

  it("retorna true quando o remoteJid vem com @lid do proprio numero", () => {
    expect(ehNumeroProprio("5511999999999@lid", "11999999999")).toBe(true);
  });

  it("retorna false para numero de outro cliente", () => {
    expect(ehNumeroProprio("5511988887777@s.whatsapp.net", "11999999999")).toBe(false);
  });

  it("retorna false quando ownNumber nao esta disponivel", () => {
    expect(ehNumeroProprio("5511999999999@s.whatsapp.net", null)).toBe(false);
    expect(ehNumeroProprio("5511999999999@s.whatsapp.net", undefined)).toBe(false);
  });

  it("retorna false para entradas invalidas", () => {
    expect(ehNumeroProprio(null, "11999999999")).toBe(false);
    expect(ehNumeroProprio("", "11999999999")).toBe(false);
  });
});

describe("baileys.client - fluxo de expiração do QR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await stopBaileys();
  });

  it("conta rotações autônomas do Baileys e para em qr_expired após MAX_QR_ROTATIONS", async () => {
    await startBaileys(QR_TENANT_ID);
    const handler = handlerQr();

    await handler({ connection: "connecting" });

    await handler({ qr: "QR_1" });
    expect(getConnectionState()).toMatchObject({ status: "awaiting_qr", qrCode: "QR_1" });

    await handler({ qr: "QR_2" });
    expect(getConnectionState()).toMatchObject({ status: "awaiting_qr", qrCode: "QR_2" });

    await handler({ qr: "QR_3" });
    expect(getConnectionState()).toMatchObject({ status: "awaiting_qr", qrCode: "QR_3" });

    await handler({ qr: "QR_4" });
    expect(getConnectionState()).toMatchObject({ status: "qr_expired", qrCode: null });
  });

  it("não rotaciona mais após qr_expired (socket antigo ignorado)", async () => {
    await startBaileys(QR_TENANT_ID);
    const handler = handlerQr();

    await handler({ qr: "QR_1" });
    await handler({ qr: "QR_2" });
    await handler({ qr: "QR_3" });
    await handler({ qr: "QR_4" });
    expect(getConnectionState().status).toBe("qr_expired");

    await handler({ qr: "QR_5" });
    expect(getConnectionState()).toMatchObject({ status: "qr_expired", qrCode: null });
  });

  it("reseta o contador ao conectar com sucesso (open)", async () => {
    await startBaileys(QR_TENANT_ID);
    const handler = handlerQr();

    await handler({ qr: "QR_1" });
    await handler({ qr: "QR_2" });
    expect(getConnectionState().status).toBe("awaiting_qr");

    await handler({ connection: "open" });
    expect(getConnectionState()).toMatchObject({ status: "connected", phoneNumber: "11999999999" });

    await handler({ qr: "QR_A" });
    await handler({ qr: "QR_B" });
    await handler({ qr: "QR_C" });
    await handler({ qr: "QR_D" });
    expect(getConnectionState().status).toBe("qr_expired");
  });

  it("close inesperado durante awaiting_qr conta como expiração e rotaciona novo QR", async () => {
    await startBaileys(QR_TENANT_ID);
    const handler = handlerQr();

    await handler({ qr: "QR_1" });
    await handler({ qr: "QR_2" });

    await handler({ connection: "close", lastDisconnect: { error: { output: { statusCode: null } } } });
    expect(getConnectionState().status).toBe("connecting");

    await handler({ qr: "QR_3" });
    await handler({ qr: "QR_4" });
    expect(getConnectionState().status).toBe("qr_expired");
  });

  it("encerra o socket ao atingir o limite (qr_expired fica sem QR)", async () => {
    await startBaileys(QR_TENANT_ID);
    const handler = handlerQr();

    await handler({ qr: "QR_1" });
    await handler({ qr: "QR_2" });
    await handler({ qr: "QR_3" });
    await handler({ qr: "QR_4" });

    expect(qrListeners["connection.update"]).toBeDefined();
    expect(getConnectionState().status).toBe("qr_expired");
    expect(getConnectionState().qrCode).toBeNull();
  });
});

describe("baileys.client - envio de áudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(async () => {
    await stopBaileys();
  });

  it("envia o áudio como nota de voz (ptt) pelo socket", async () => {
    await startBaileys(QR_TENANT_ID);
    const { default: makeWASocket } = await import("@whiskeysockets/baileys");
    const socket = makeWASocket();

    const buffer = Buffer.from([0x4f, 0x67, 0x67, 0x53]); // OggS
    await sendWhatsAppAudio("5511988887777@s.whatsapp.net", buffer, "audio/ogg; codecs=opus", QR_TENANT_ID);

    expect(socket.sendMessage).toHaveBeenCalledWith("5511988887777@s.whatsapp.net", {
      audio: buffer,
      mimetype: "audio/ogg",
      ptt: true,
    });
  });

  it("normaliza o mimetype removendo parâmetros adicionais", async () => {
    await startBaileys(QR_TENANT_ID);
    const { default: makeWASocket } = await import("@whiskeysockets/baileys");
    const socket = makeWASocket();

    await sendWhatsAppAudio("5511988887777@s.whatsapp.net", Buffer.from("x"), "audio/ogg; codecs=opus", QR_TENANT_ID);

    expect(socket.sendMessage).toHaveBeenCalledWith(
      "5511988887777@s.whatsapp.net",
      expect.objectContaining({ mimetype: "audio/ogg" })
    );
  });

  it("lanca erro quando o WhatsApp nao esta conectado", async () => {
    await expect(
      sendWhatsAppAudio("5511988887777@s.whatsapp.net", Buffer.from("x"), "audio/ogg")
    ).rejects.toThrow("WhatsApp não conectado");
  });

  it("lanca erro para buffer vazio", async () => {
    await startBaileys(QR_TENANT_ID);
    await expect(
      sendWhatsAppAudio("5511988887777@s.whatsapp.net", Buffer.alloc(0), "audio/ogg", QR_TENANT_ID)
    ).rejects.toThrow("Áudio inválido ou vazio");
  });
});

describe("baileys.client - recebimento de áudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(async () => {
    await stopBaileys();
  });

  async function emitirMensagens(mensagens) {
    const handler = qrListeners["messages.upsert"];
    await handler({ messages: mensagens, type: "notify" });
  }

  it("baixa o áudio e repassa ao handler de mídia", async () => {
    await startBaileys(QR_TENANT_ID);
    const mediaHandler = vi.fn().mockResolvedValue(true);
    setOnMediaMessageHandler(mediaHandler);

    const msg = {
      key: { fromMe: false, remoteJid: "5511988887777@s.whatsapp.net" },
      message: { audioMessage: { mimetype: "audio/ogg; codecs=opus", ptt: true } },
      pushName: "Maria",
    };
    await emitirMensagens([msg]);

    const buffer = Buffer.from([1, 2, 3, 4]);
    expect(mediaHandler).toHaveBeenCalledWith(
      QR_TENANT_ID,
      "5511988887777@s.whatsapp.net",
      "Maria",
      buffer,
      "audio/ogg; codecs=opus"
    );
  });

  it("ignora áudio sem handler e sem erro quando download falha", async () => {
    await startBaileys(QR_TENANT_ID);
    const mediaHandler = vi.fn().mockResolvedValue(true);
    setOnMediaMessageHandler(mediaHandler);
    const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
    downloadMediaMessage.mockRejectedValue(new Error("download failed"));

    const msg = {
      key: { fromMe: false, remoteJid: "5511988887777@s.whatsapp.net" },
      message: { audioMessage: { mimetype: "audio/ogg; codecs=opus" } },
      pushName: "Maria",
    };
    await emitirMensagens([msg]);
    expect(mediaHandler).not.toHaveBeenCalled();
  });
});
