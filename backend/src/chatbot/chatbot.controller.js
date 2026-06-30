import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import * as baileysClient from "./baileys.client.js";
import * as sessionService from "./chatbot.session.js";
import { processMessage } from "./chatbot.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

baileysClient.setOnMessageHandler(processMessage);

export async function getStatus(req, res) {
  const state = baileysClient.getConnectionState();
  const response = state.tenantId !== req.tenantId
    ? { status: "disconnected", qrCode: null, error: null, tenantId: req.tenantId, lastDisconnectReason: null }
    : state;
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json(response);
}

export async function connect(req, res) {
  const { tenantId } = req;

  const currentState = baileysClient.getConnectionState();
  const isOwner = currentState.tenantId === tenantId;

  if (isOwner && currentState.status === "connected") {
    return res.json({ message: "Já conectado" });
  }

  if (isOwner && (currentState.status === "reconnecting" || currentState.status === "awaiting_qr" || currentState.status === "connecting")) {
    return res.json({ message: "Já tentando conectar, aguarde..." });
  }

  const authDir = path.join(__dirname, "..", "..", "..", `baileys_auth_${tenantId}`);
  if (currentState === "disconnected" && fs.existsSync(authDir)) {
    const state = baileysClient.getConnectionState();
    if (state.lastDisconnectReason === 401 || state.lastDisconnectReason === 405) {
      fs.rmSync(authDir, { recursive: true, force: true });
      logger.info({ reason: state.lastDisconnectReason }, "Auth removida — sessão foi deslogada/substituída");
    }
  }

  try {
    await baileysClient.startBaileys(tenantId);
    res.json({ message: "Conectando..." });
  } catch (err) {
    logger.error({ err }, "Erro ao iniciar Baileys");
    res.status(500).json({ error: "Erro ao iniciar conexão WhatsApp" });
  }
}

export async function disconnect(req, res) {
  try {
    await baileysClient.stopBaileys();
    res.json({ message: "Desconectado" });
  } catch (err) {
    logger.error({ err }, "Erro ao desconectar");
    res.json({ message: "Desconectado" });
  }
}

export async function listSessions(req, res) {
  const sessions = await sessionService.listarSessoes(req.tenantId);
  res.json(sessions);
}

export async function getSession(req, res) {
  const { id } = req.params;

  const { data: session, error } = await supabaseAdmin
    .from("chatbot_session")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", req.tenantId)
    .single();

  if (error) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  res.json(session);
}

export async function sendReply(req, res) {
  const { id } = req.params;
  const { mensagem } = req.body;

  if (!mensagem || mensagem.trim() === "") {
    return res.status(400).json({ error: "Mensagem é obrigatória" });
  }

  const { data: session, error } = await supabaseAdmin
    .from("chatbot_session")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", req.tenantId)
    .single();

  if (error) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  await baileysClient.sendWhatsAppMessage(session.remote_jid, mensagem.trim());
  res.json({ message: "Mensagem enviada" });
}

export async function resetSession(req, res) {
  const { id } = req.params;

  const { data: session, error } = await supabaseAdmin
    .from("chatbot_session")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", req.tenantId)
    .single();

  if (error) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  await supabaseAdmin
    .from("chatbot_session")
    .update({ state: "MENU_PRINCIPAL", state_data: {} })
    .eq("id", id);

  await baileysClient.sendWhatsAppMessage(
    session.remote_jid,
    "🔄 Sessão reiniciada! Escolha uma opção no menu."
  );

  res.json({ message: "Sessão reiniciada" });
}
