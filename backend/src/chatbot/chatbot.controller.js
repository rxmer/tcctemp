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
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json(state);
}

export async function connect(req, res) {
  const { tenantId } = req;

  if (baileysClient.getConnectionState().status === "connected") {
    return res.json({ message: "Já conectado" });
  }

  const authDir = path.join(__dirname, "..", "..", "..", `baileys_auth_${tenantId}`);
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
    logger.info("Auth removida para nova conexão");
  }

  await baileysClient.startBaileys(tenantId);
  res.json({ message: "Conectando..." });
}

export async function disconnect(req, res) {
  await baileysClient.stopBaileys();
  res.json({ message: "Desconectado" });
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
