import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppMessage } from "./baileys.client.js";

export async function criarSessao({ tenantId, remoteJid, clientPhone, clientName }) {
  const { data: existingData, error: existingError } = await supabaseAdmin
    .from("chatbot_session")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("remote_jid", remoteJid)
    .eq("ativo", true)
    .maybeSingle();

  if (existingError) logger.warn({ err: existingError }, "Erro ao buscar sessão existente");

  if (existingData?.id) {
    const { data, error } = await supabaseAdmin
      .from("chatbot_session")
      .update({ ativo: false })
      .eq("id", existingData.id)
      .select()
      .single();

    if (error) logger.warn({ err: error }, "Erro ao desativar sessão anterior");
  }

  const { data, error } = await supabaseAdmin
    .from("chatbot_session")
    .insert({
      tenant_id: tenantId,
      remote_jid: remoteJid,
      client_phone: clientPhone,
      client_name: clientName,
      state: "MENU_PRINCIPAL",
      state_data: {},
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar sessão: ${error.message}`);
  return data;
}

export async function buscarSessao(tenantId, remoteJid) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_session")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("remote_jid", remoteJid)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao buscar sessão: ${error.message}`);
  return data;
}

export async function atualizarSessao(sessionId, updates) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_session")
    .update({ ...updates, ultima_atividade: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar sessão: ${error.message}`);
  return data;
}

export async function listarSessoes(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_session")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("ultima_atividade", { ascending: false })
    .limit(50);

  if (error) throw new AppError(`Erro ao listar sessões: ${error.message}`);
  return data;
}

export async function contarNaoLidas(tenantId) {
  const { data: sessoes } = await supabaseAdmin
    .from("chatbot_session")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("ativo", true);

  if (!sessoes?.length) return { total: 0, sessoes: [] };

  const resultado = [];
  let total = 0;

  for (const sess of sessoes) {
    const { data: ultimaMsg } = await supabaseAdmin
      .from("chatbot_mensagem")
      .select("criado_em")
      .eq("session_id", sess.id)
      .neq("remetente", "cliente")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const apos = ultimaMsg?.criado_em ?? "1970-01-01T00:00:00Z";

    const { count } = await supabaseAdmin
      .from("chatbot_mensagem")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sess.id)
      .eq("remetente", "cliente")
      .gt("criado_em", apos);

    if (count > 0) {
      resultado.push({ session_id: sess.id, nao_lidas: count });
      total += count;
    }
  }

  return { total, sessoes: resultado };
}

export async function registrarMensagem({ tenantId, sessionId, remetente, texto }) {
  const { error } = await supabaseAdmin
    .from("chatbot_mensagem")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      remetente,
      texto,
    });

  if (error) logger.warn({ err: error }, "Erro ao registrar mensagem do chatbot");
}

export async function registrarMensagemPorJid(remoteJid, texto, remetente = "bot") {
  const { data } = await supabaseAdmin
    .from("chatbot_session")
    .select("id, tenant_id")
    .eq("remote_jid", remoteJid)
    .order("ultima_atividade", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return;
  await registrarMensagem({ tenantId: data.tenant_id, sessionId: data.id, remetente, texto });
}

export async function listarMensagens(tenantId, sessionId) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_mensagem")
    .select("id, remetente, texto, criado_em")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)
    .order("criado_em", { ascending: true })
    .limit(300);

  if (error) throw new AppError(`Erro ao listar mensagens: ${error.message}`);
  return data;
}

export async function desativarSessao(sessionId) {
  const { error } = await supabaseAdmin
    .from("chatbot_session")
    .update({ ativo: false })
    .eq("id", sessionId);

  if (error) throw new AppError(`Erro ao desativar sessão: ${error.message}`);
}

const SESSION_TIMEOUT_MINUTES = 30;

export async function limparSessoesExpiradas() {
  const limite = new Date(Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  const { data: expiradas, error: queryError } = await supabaseAdmin
    .from("chatbot_session")
    .select("id, state")
    .eq("ativo", true)
    .lt("ultima_atividade", limite)
    .neq("state", "FALANDO_COM_ATENDENTE");

  if (queryError) {
    logger.warn({ err: queryError }, "Erro ao buscar sessões expiradas");
    return;
  }

  for (const sess of (expiradas ?? [])) {
    await supabaseAdmin
      .from("chatbot_session")
      .update({
        state: "MENU_PRINCIPAL",
        state_data: {},
        ultima_atividade: new Date().toISOString(),
      })
      .eq("id", sess.id);

    logger.info({ sessionId: sess.id }, "Sessão expirada reiniciada para MENU_PRINCIPAL");
  }

  const { data: atendenteExpiradas } = await supabaseAdmin
    .from("chatbot_session")
    .select("id, remote_jid")
    .eq("ativo", true)
    .eq("state", "FALANDO_COM_ATENDENTE")
    .lt("ultima_atividade", limite);

  for (const sess of (atendenteExpiradas ?? [])) {
    await supabaseAdmin
      .from("chatbot_session")
      .update({
        state: "MENU_PRINCIPAL",
        state_data: {},
        ultima_atividade: new Date().toISOString(),
      })
      .eq("id", sess.id);

    sendWhatsAppMessage(
      sess.remote_jid,
      "⏳ Parece que o atendente está demorando. O bot está de volta! Como posso ajudar?"
    ).catch(() => {});

    logger.info({ sessionId: sess.id }, "Sessão FALANDO_COM_ATENDENTE expirada, voltou ao MENU_PRINCIPAL");
  }

  logger.info({ quantidade: (expiradas?.length ?? 0) + (atendenteExpiradas?.length ?? 0) }, "Sessões expiradas reiniciadas");
}
