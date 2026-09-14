import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";

const BUCKET = "chatbot-audios";
const URL_ASSINADA_SEGUNDOS = 12 * 60 * 60;

function extrairExtensao(mimetype) {
  const type = String(mimetype ?? "").split(";")[0] ?? "";
  const sub = type.split("/")[1];
  if (/^[a-zA-Z0-9]{1,10}$/.test(sub ?? "")) return sub.toLowerCase();
  return "ogg";
}

export async function listarBucketsDisponiveis() {
  const { data } = await supabaseAdmin.storage.listBuckets();
  return (data ?? []).map((b) => b.name);
}

export async function garantirBucket() {
  try {
    const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
    if (data) return true;
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 25 * 1024 * 1024,
    });
    if (error) {
      logger.warn({ err: error }, "Erro ao criar bucket de áudios");
      return false;
    }
    logger.info("Bucket de áudios criado automaticamente");
    return true;
  } catch (err) {
    logger.warn({ err }, "Bucket de áudios indisponível");
    return false;
  }
}

export async function salvarAudio({ tenantId, sessionId, buffer, mimetype }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Áudio vazio");
  }
  await garantirBucket();
  const extensao = extrairExtensao(mimetype);
  const caminho = `${tenantId}/${sessionId}/${Date.now()}-${randomUUID()}.${extensao}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(caminho, buffer, {
    contentType: String(mimetype ?? "").split(";")[0] || "audio/ogg",
    upsert: false,
  });
  if (error) {
    throw new Error(`Erro ao salvar áudio no storage: ${error.message}`);
  }
  return caminho;
}

export async function obterUrlAssinada(caminho) {
  if (!caminho) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(caminho, URL_ASSINADA_SEGUNDOS);
  if (error || !data?.signedUrl) {
    logger.warn({ err: error, caminho }, "Erro ao assinar URL do áudio");
    return null;
  }
  return data.signedUrl;
}