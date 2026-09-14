import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import * as baileysClient from "./baileys.client.js";
import * as sessionService from "./chatbot.session.js";
import { processMessage, processAudioMessage, sendMenu } from "./chatbot.service.js";
import { salvarAudio } from "./chatbot.media.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

baileysClient.setOnMessageHandler(processMessage);
baileysClient.setOnMediaMessageHandler(processAudioMessage);
baileysClient.setOnOutgoingMessage((jid, text, origem) =>
  sessionService.registrarMensagemPorJid(jid, text, origem || "bot")
);

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
  const motivosAuthInvalida = [401, 403, 405];
  if (
    isOwner &&
    currentState.status === "disconnected" &&
    motivosAuthInvalida.includes(currentState.lastDisconnectReason) &&
    fs.existsSync(authDir)
  ) {
    fs.rmSync(authDir, { recursive: true, force: true });
    logger.info(
      { reason: currentState.lastDisconnectReason },
      "Auth removida — sessão foi deslogada/substituída"
    );
  }

  try {
    baileysClient.resetQrExpirationCount();
    await baileysClient.startBaileys(tenantId);
    res.json({ message: "Conectando..." });
  } catch (err) {
    logger.error({ err }, "Erro ao iniciar Baileys");
    const isExpected = err && err.message && /outro estabelecimento|já está conectado/i.test(err.message);
    res.status(isExpected ? 409 : 500).json({
      error: isExpected ? err.message : "Erro ao iniciar conexão WhatsApp",
    });
  }
}

export async function disconnect(req, res) {
  try {
    await baileysClient.stopBaileys();
    const authDir = path.join(__dirname, "..", "..", "..", `baileys_auth_${req.tenantId}`);
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      logger.info({ tenantId: req.tenantId }, "Auth removida — sessão limpa ao desconectar");
    }
    res.json({ message: "Desconectado e sessão limpa" });
  } catch (err) {
    logger.error({ err }, "Erro ao desconectar");
    res.json({ message: "Desconectado" });
  }
}

export async function listSessions(req, res) {
  const { page, limit, ordem = "recentes", estado, busca } = req.query;

  const { status, phoneNumber } = baileysClient.getConnectionState();
  if (status !== "connected") {
    return res.json({ data: [], total: 0, conectado: false });
  }

  const sessions = await sessionService.listarSessoes(req.tenantId, {
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    ordem,
    estado: estado || null,
    busca: busca?.trim() || "",
    numeroOrigem: phoneNumber || null,
  });

  res.json(sessions);
}

export async function getUnreadCount(req, res) {
  const state = baileysClient.getConnectionState();
  if (state.status !== "connected" || state.tenantId !== req.tenantId) {
    return res.json({ total: 0, sessoes: [] });
  }
  const result = await sessionService.contarNaoLidas(req.tenantId, state.phoneNumber);
  res.json(result);
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

  await baileysClient.sendWhatsAppMessage(session.remote_jid, mensagem.trim(), "atendente");
  await supabaseAdmin
    .from("chatbot_session")
    .update({ ultima_atividade: new Date().toISOString(), atendente_engajado: true })
    .eq("id", id);
  res.json({ message: "Mensagem enviada" });
}

export async function sendReplyAudio(req, res) {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "Arquivo de áudio é obrigatório" });
  }

  const mimetype = String(req.file.mimetype ?? "");
  if (!mimetype.toLowerCase().startsWith("audio/")) {
    return res.status(415).json({ error: "O arquivo deve ser um áudio" });
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

  const caminho = await salvarAudio({
    tenantId: req.tenantId,
    sessionId: session.id,
    buffer: req.file.buffer,
    mimetype,
  });

  await baileysClient.sendWhatsAppAudio(
    session.remote_jid,
    req.file.buffer,
    mimetype,
    req.tenantId
  );

  await sessionService.registrarMensagem({
    tenantId: req.tenantId,
    sessionId: session.id,
    remetente: "atendente",
    texto: "[🎤 Áudio]",
    tipoMedia: "audio",
    mediaUrl: caminho,
  });

  await supabaseAdmin
    .from("chatbot_session")
    .update({ ultima_atividade: new Date().toISOString(), atendente_engajado: true })
    .eq("id", id);

  res.json({ message: "Áudio enviado" });
}

export async function getMensagens(req, res) {
  const { id } = req.params;

  const { data: session, error } = await supabaseAdmin
    .from("chatbot_session")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", req.tenantId)
    .single();

  if (error) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  const mensagens = await sessionService.listarMensagens(req.tenantId, session.id);
  res.json(mensagens);
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

  await sendMenu(session.remote_jid, { ...session, state: "MENU_PRINCIPAL", state_data: {} });

  res.json({ message: "Sessão reiniciada" });
}
