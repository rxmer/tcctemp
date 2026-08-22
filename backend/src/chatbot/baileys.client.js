import makeWASocket, { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import { createRequire } from "module";
import { Boom } from "@hapi/boom";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import pino from "pino";
import { logger } from "../config/logger.js";

const require = createRequire(import.meta.url);
const { sendButtons: helperSendButtons, sendInteractiveMessage: helperSendInteractive } = require("baileys_helper");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let socket = null;
let currentTenantId = null;
let authState = null;
let connectionState = {
  status: "disconnected",
  qrCode: null,
  error: null,
  lastDisconnectReason: null,
};

let onMessageHandler = null;
let intentionalDisconnect = false;
let socketId = 0;

const baileysLogger = pino({ level: "silent" });

export function setOnMessageHandler(handler) {
  onMessageHandler = handler;
}

export function getConnectionState() {
  return { ...connectionState, tenantId: currentTenantId };
}

export function getAuthDir(tenantId) {
  const dir = path.join(__dirname, "..", "..", "..", `baileys_auth_${tenantId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function startBaileys(tenantId) {
  if (socket) {
    socketId++;
    await stopBaileys(true);
  }

  intentionalDisconnect = false;
  currentTenantId = tenantId;
  const authDir = getAuthDir(tenantId);

  const { state: authStateValue, saveCreds } = await useMultiFileAuthState(authDir);
  authState = authStateValue;

  const thisSocketId = ++socketId;
  let pairingCompleted = false;

  socket = makeWASocket({
    auth: {
      creds: authStateValue.creds,
      keys: makeCacheableSignalKeyStore(authStateValue.keys, baileysLogger),
    },
    logger: baileysLogger,
    printQRInTerminal: false,
    syncFullHistory: false,
    connectTimeoutMs: 120000,
    keepAliveIntervalMs: 30000,
    markOnlineOnConnect: false,
    browser: ["Chrome (Windows)", "Chrome", "120.0.0"],
    qrTimeout: 120000,
    fireInitQueries: false,
  });

  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr, isNewLogin }) => {
    if (thisSocketId !== socketId) {
      logger.debug({ thisSocketId, currentSocketId: socketId }, "Evento de socket antigo, ignorando");
      return;
    }

    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const errorMessage = lastDisconnect?.error?.message;
    logger.info({ connection, hasQr: !!qr, statusCode, errorMessage, isNewLogin, errorType: lastDisconnect?.error?.constructor?.name }, "Baileys connection.update");

    if (isNewLogin) {
      pairingCompleted = true;
      connectionState.status = "connecting";
      connectionState.error = null;
      logger.info("Pareamento concluído com sucesso");
    }

    if (qr) {
      connectionState.qrCode = qr;
      connectionState.status = "awaiting_qr";
      connectionState.error = null;
      logger.info("QR Code gerado");
    }

    if (connection === "open") {
      connectionState.status = "connected";
      connectionState.qrCode = null;
      connectionState.error = null;
      pairingCompleted = false;
      logger.info("Baileys conectado com sucesso");
    }

    if (connection === "close") {
      const wasIntentional = intentionalDisconnect;
      intentionalDisconnect = false;

      connectionState.qrCode = null;

      if (wasIntentional) {
        connectionState.status = "disconnected";
        logger.info("Desconectado manualmente");
        return;
      }

      connectionState.lastDisconnectReason = statusCode ?? null;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isTimedOut = statusCode === DisconnectReason.timedOut;
      const isConnectionClosed = statusCode === DisconnectReason.connectionClosed;
      const isConnectionReplaced = statusCode === DisconnectReason.connectionReplaced;
      const isStreamError = statusCode === 515;

      logger.warn({ statusCode, errorMessage, isLoggedOut, isTimedOut, isConnectionClosed, isConnectionReplaced, isStreamError, pairingCompleted },
        "Conexão fechada - analisando motivo");

      if (isLoggedOut || isConnectionReplaced) {
        connectionState.status = "disconnected";
        connectionState.error = isLoggedOut
          ? "Desconectado do WhatsApp. Clique em Conectar para gerar novo QR Code."
          : "Conexão substituída por outro dispositivo. Clique em Conectar novamente.";
        logger.info({ statusCode }, "Desconectado definitivamente");
      } else if (isStreamError && pairingCompleted) {
        connectionState.status = "connecting";
        connectionState.error = null;
        logger.info("Reiniciando stream após pareamento bem-sucedido...");
        setTimeout(() => startBaileys(tenantId), 1500);
      } else if (!statusCode && connectionState.status === "connected") {
        logger.info("Close sem statusCode após conexão ativa, ignorando (cleanup do servidor)");
      } else if (connectionState.status === "connecting" || connectionState.status === "reconnecting") {
        logger.info({ currentStatus: connectionState.status }, "Close durante reconexão, ignorando");
      } else {
        connectionState.status = "reconnecting";
        connectionState.error = isStreamError ? null : connectionState.error;
        const delay = isTimedOut ? 3000 : 5000;
        logger.info({ delay, statusCode }, `Reconectando em ${delay / 1000}s...`);
        setTimeout(() => startBaileys(tenantId), delay);
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key?.fromMe) continue;

      let text = null;
      const msgType = Object.keys(msg.message || {}).find((k) => k !== "messageContextInfo");
      logger.debug({ msgType, fromMe: msg.key?.fromMe }, "Mensagem recebida");

      if (msg.message?.buttonsResponseMessage) {
        text = msg.message.buttonsResponseMessage.selectedButtonId;
        logger.debug({ text }, "buttonsResponse");
      } else if (msg.message?.listResponseMessage) {
        text = msg.message.listResponseMessage.singleSelectReply?.selectedRowId;
        logger.debug({ text }, "listResponse");
      } else if (msg.message?.interactiveResponseMessage) {
        const resp = msg.message.interactiveResponseMessage;
        if (resp.nativeFlowResponseMessage) {
          const nf = resp.nativeFlowResponseMessage;
          if (nf.id) {
            text = nf.id;
          } else if (nf.paramsJson) {
            try {
              const params = JSON.parse(nf.paramsJson);
              text = params.id || params.display_text;
            } catch {}
          }
          logger.debug({ text }, "interactiveResponse");
          if (!text && nf.paramsJson) {
            text = nf.paramsJson.replace(/[{}"']/g, "").trim();
          }
        }
      } else if (msg.message?.templateButtonReplyMessage) {
        text = msg.message.templateButtonReplyMessage.selectedId;
        logger.debug({ text }, "templateButtonReply");
      } else if (msg.message?.conversation) {
        text = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        text = msg.message.extendedTextMessage.text;
      }

      if (!text || text === "") continue;

      const remoteJid = msg.key.remoteJid;
      const pushName = msg.pushName || "Cliente";

      logger.info({ jidSuffix: remoteJid?.split("@")[1], phoneSuffix: remoteJid?.split("@")[0]?.slice(-4), textLength: text.length }, "Mensagem processada");

      if (onMessageHandler) {
        try {
          await onMessageHandler(tenantId, remoteJid, text, pushName);
        } catch (err) {
          logger.error({ err, phoneSuffix: remoteJid?.split("@")[0]?.slice(-4) }, "Erro no handler de mensagem");
          try {
            await socket.sendMessage(remoteJid, {
              text: "Desculpe, ocorreu um erro. Tente novamente.",
            });
          } catch (err2) {
            logger.error({ err: err2 }, "Erro ao enviar fallback");
          }
        }
      }
    }
    } catch (err) {
      logger.error({ err }, "Erro em messages.upsert");
    }
  });

  socket.ev.on("creds.update", saveCreds);

  return socket;
}

export async function stopBaileys(keepState = false) {
  intentionalDisconnect = true;
  if (socket) {
    try {
      socket.ws?.close();
    } catch {}
    try {
      socket.end(undefined);
    } catch {}
    socket = null;
  }
  currentTenantId = null;
  if (!keepState) {
    connectionState = {
      status: "disconnected",
      qrCode: null,
      error: null,
    };
  }
}

export async function sendWhatsAppMessage(jid, text) {
  if (!socket) throw new Error("WhatsApp não conectado");
  await socket.sendMessage(jid, { text });
}

export async function sendButtons(jid, text, buttons, footer) {
  if (!socket) throw new Error("WhatsApp não conectado");
  logger.debug({ btnCount: buttons.length }, "sendButtons");

  try {
    await helperSendButtons(socket, jid, {
      text,
      footer: footer || "",
      buttons: buttons.map((b) => ({ id: b.id, text: b.text })),
    });
    logger.debug("sendButtons OK");
  } catch (err) {
    logger.warn({ err }, "sendButtons via helper falhou, enviando como texto");
    const numbered = buttons.map((b, i) => `${i + 1}. ${b.text}`).join("\n");
    await sendWhatsAppMessage(jid, `${text}\n\n${numbered}\n\n_Responda com o número desejado_`);
  }
}

export async function sendList(jid, text, buttonLabel, sections, footer) {
  if (!socket) throw new Error("WhatsApp não conectado");
  logger.debug({ sectionCount: sections?.length }, "sendList");

  try {
    await helperSendInteractive(socket, jid, {
      text,
      footer: footer || "",
      interactiveButtons: [{
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: buttonLabel || "Selecionar",
          sections: sections.map((s) => ({
            title: s.title,
            rows: s.rows.map((r) => ({
              id: r.rowId,
              title: r.title,
              description: r.description,
            })),
          })),
        }),
      }],
    });
    logger.debug("sendList OK");
  } catch (err) {
    logger.warn({ err }, "sendList via helper falhou, enviando como texto");
    let msg = `${text}\n\n`;
    for (const section of sections) {
      msg += `*${section.title}*\n`;
      section.rows.forEach((r, i) => {
        msg += `${i + 1}. ${r.title}`;
        if (r.description) msg += ` — ${r.description}`;
        msg += "\n";
      });
      msg += "\n";
    }
    msg += "_Responda com o número desejado_";
    await sendWhatsAppMessage(jid, msg);
  }
}
