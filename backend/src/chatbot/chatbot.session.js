import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";

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

  if (!expiradas?.length) return;

  for (const sess of expiradas) {
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

  logger.info({ quantidade: expiradas.length }, "Sessões expiradas reiniciadas");
}
