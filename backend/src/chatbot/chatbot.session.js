import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppMessage, getConnectionState } from "./baileys.client.js";
import { obterUrlAssinada } from "./chatbot.media.js";

const MAX_MENSAGEM_LENGTH = 500;

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

  const numeroOrigem = getConnectionState().phoneNumber || null;

  const { data, error } = await supabaseAdmin
    .from("chatbot_session")
    .insert({
      tenant_id: tenantId,
      remote_jid: remoteJid,
      client_phone: clientPhone,
      client_name: clientName,
      numero_origem: numeroOrigem,
      state: "MENU_PRINCIPAL",
      state_data: {},
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar sessão: ${error.message}`);
  return data;
}

export async function buscarSessao(tenantId, remoteJid) {
  const numeroOrigem = getConnectionState().phoneNumber || null;

  let query = supabaseAdmin
    .from("chatbot_session")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("remote_jid", remoteJid)
    .eq("ativo", true);

  if (numeroOrigem) query = query.eq("numero_origem", numeroOrigem);

  const { data, error } = await query.maybeSingle();

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

const GRUPOS_ESTADO = {
  atendente: { tipo: "eq", valor: "FALANDO_COM_ATENDENTE" },
  menu: { tipo: "eq", valor: "MENU_PRINCIPAL" },
  agendando: {
    tipo: "in",
    valor: [
      "ESCOLHENDO_SERVICO",
      "ESCOLHENDO_VEICULO",
      "ESCOLHENDO_DATA",
      "ESCOLHENDO_HORARIO",
      "DIGITANDO_NOME",
      "DIGITANDO_TELEFONE",
      "DIGITANDO_VEICULO_MARCA",
      "DIGITANDO_VEICULO_MODELO",
      "DIGITANDO_VEICULO_PLACA",
      "CONFIRMANDO_AGENDAMENTO",
      "AGENDAMENTO_CONFIRMADO",
    ],
  },
};

function aplicarFiltrosSessao(query, tenantId, estado, busca, numeroOrigem) {
  let q = query.eq("tenant_id", tenantId);

  if (numeroOrigem) q = q.eq("numero_origem", numeroOrigem);

  if (estado) {
    const grupo = GRUPOS_ESTADO[estado];
    if (grupo?.tipo === "in") q = q.in("state", grupo.valor);
    else q = q.eq("state", grupo?.valor ?? estado);
  }

  if (busca) {
    q = q.or(`client_name.ilike.%${busca}%,client_phone.ilike.%${busca}%`);
  }

  return q;
}

export async function listarSessoes(
  tenantId,
  {
    page = 1,
    limit = 20,
    ordem = "recentes",
    estado = null,
    busca = "",
    numeroOrigem = null,
    naoLidasIds = null,
    priorizarNaoLidas = false,
  } = {}
) {
  const pagina = Math.max(1, Number(page) || 1);
  const tamanho = Math.min(100, Math.max(1, Number(limit) || 20));
  const inicio = (pagina - 1) * tamanho;

  const base = (colunas, opcoes) =>
    aplicarFiltrosSessao(
      supabaseAdmin.from("chatbot_session").select(colunas ?? "*", opcoes),
      tenantId,
      estado,
      busca,
      numeroOrigem
    );

  const ordenar = (q) =>
    ordem === "nome"
      ? q.order("client_name", { ascending: true, nullsFirst: true })
      : q.order("ultima_atividade", { ascending: false });

  const idsNaoLidas = naoLidasIds?.length ? naoLidasIds : null;

  let countQuery = base("id", { count: "exact", head: true });
  if (idsNaoLidas) countQuery = countQuery.in("id", idsNaoLidas);
  const { count, error: countError } = await countQuery;
  if (countError) throw new AppError(`Erro ao listar sessões: ${countError.message}`);

  let data = [];

  if (priorizarNaoLidas && idsNaoLidas) {
    const { count: volumeNaoLidas } = await base("id", {
      count: "exact",
      head: true,
    }).in("id", idsNaoLidas);
    const totalNaoLidas = volumeNaoLidas ?? 0;

    if (inicio < totalNaoLidas) {
      const fimNaoLidas = Math.min(totalNaoLidas, inicio + tamanho) - 1;
      const { data: naoLidas, error: erroNao } = await ordenar(
        base().in("id", idsNaoLidas)
      ).range(inicio, Math.max(inicio, fimNaoLidas));
      if (erroNao) throw new AppError(`Erro ao listar sessões: ${erroNao.message}`);

      data = naoLidas ?? [];
      const restante = tamanho - data.length;
      if (restante > 0) {
        const { data: lidas, error: erroLidas } = await ordenar(
          base().not("id", "in", idsNaoLidas)
        ).range(0, restante - 1);
        if (erroLidas) throw new AppError(`Erro ao listar sessões: ${erroLidas.message}`);
        data = [...data, ...(lidas ?? [])];
      }
    } else {
      const inicioLidas = inicio - totalNaoLidas;
      const { data: lidas, error: erroLidas } = await ordenar(
        base().not("id", "in", idsNaoLidas)
      ).range(inicioLidas, inicioLidas + tamanho - 1);
      if (erroLidas) throw new AppError(`Erro ao listar sessões: ${erroLidas.message}`);
      data = lidas ?? [];
    }
  } else {
    let query = base();
    if (idsNaoLidas) query = query.in("id", idsNaoLidas);
    const { data: rows, error } = await ordenar(query).range(inicio, inicio + tamanho - 1);
    if (error) throw new AppError(`Erro ao listar sessões: ${error.message}`);
    data = rows ?? [];
  }

  const enriquecidas = await anexarUltimaMensagem(data);
  return { data: enriquecidas, total: count ?? 0 };
}

async function anexarUltimaMensagem(sessoes) {
  const ids = (sessoes ?? []).map((s) => s.id);
  if (!ids.length) return sessoes ?? [];

  const { data: msgs, error } = await supabaseAdmin
    .from("chatbot_mensagem")
    .select("session_id, remetente, tipo_media, texto")
    .in("session_id", ids)
    .order("criado_em", { ascending: false })
    .limit(1000);

  if (error) {
    logger.warn({ err: error }, "Erro ao anexar última mensagem das sessões");
    return sessoes;
  }

  const ultimaPorSessao = new Map();
  for (const m of msgs ?? []) {
    if (!ultimaPorSessao.has(m.session_id)) ultimaPorSessao.set(m.session_id, m);
  }

  return sessoes.map((s) => {
    const ultima = ultimaPorSessao.get(s.id);
    return {
      ...s,
      ultima_mensagem_remetente: ultima?.remetente ?? null,
      ultima_mensagem_tipo_media: ultima?.tipo_media ?? null,
      ultima_mensagem_previa: ultima?.texto ?? s.ultima_mensagem ?? "",
    };
  });
}

export async function contarNaoLidas(tenantId, numeroOrigem) {
  try {
    const { data, error } = await supabaseAdmin.rpc("contar_nao_lidas", {
      p_tenant: tenantId,
      p_numero: numeroOrigem ?? null,
    });

    if (!error) {
      const sessoes = (data ?? []).map((s) => ({
        session_id: s.session_id,
        nao_lidas: Number(s.nao_lidas),
      }));
      const total = sessoes.reduce((acc, s) => acc + s.nao_lidas, 0);
      return { total, sessoes };
    }

    logger.warn({ err: error }, "RPC contar_nao_lidas indisponível, usando fallback");
  } catch (err) {
    logger.warn({ err }, "Falha na RPC contar_nao_lidas, usando fallback");
  }

  let sessoesQuery = supabaseAdmin
    .from("chatbot_session")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("ativo", true);

  if (numeroOrigem) sessoesQuery = sessoesQuery.eq("numero_origem", numeroOrigem);

  const { data: sessoes } = await sessoesQuery;

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

export async function registrarMensagem({ tenantId, sessionId, remetente, texto, tipoMedia = null, mediaUrl = null }) {
  const { error } = await supabaseAdmin
    .from("chatbot_mensagem")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      remetente,
      texto: String(texto ?? "").slice(0, MAX_MENSAGEM_LENGTH),
      tipo_media: tipoMedia || null,
      media_url: mediaUrl || null,
    });

  if (error) logger.warn({ err: error }, "Erro ao registrar mensagem do chatbot");
}

export async function registrarMensagemPorJid(remoteJid, texto, remetente = "bot") {
  const numeroOrigem = getConnectionState().phoneNumber || null;

  let query = supabaseAdmin
    .from("chatbot_session")
    .select("id, tenant_id")
    .eq("remote_jid", remoteJid);

  if (numeroOrigem) query = query.eq("numero_origem", numeroOrigem);

  const { data } = await query
    .order("ultima_atividade", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return;
  await registrarMensagem({ tenantId: data.tenant_id, sessionId: data.id, remetente, texto });
}

export async function listarMensagens(tenantId, sessionId) {
  const { data, error } = await supabaseAdmin
    .from("chatbot_mensagem")
    .select("id, remetente, texto, tipo_media, media_url, criado_em")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)
    .order("criado_em", { ascending: true })
    .limit(300);

  if (error) throw new AppError(`Erro ao listar mensagens: ${error.message}`);

  const comUrl = [];
  for (const msg of data ?? []) {
    if (msg.tipo_media === "audio" && msg.media_url) {
      const url = await obterUrlAssinada(msg.media_url);
      if (url) comUrl.push({ ...msg, media_url: url });
      else comUrl.push({ ...msg, media_url: null });
    } else {
      comUrl.push({ ...msg, media_url: msg.media_url ?? null });
    }
  }
  return comUrl;
}

export async function desativarSessao(sessionId) {
  const { error } = await supabaseAdmin
    .from("chatbot_session")
    .update({ ativo: false })
    .eq("id", sessionId);

  if (error) throw new AppError(`Erro ao desativar sessão: ${error.message}`);
}

export const SESSION_TIMEOUT_MINUTES = 5;
export const ATENDENTE_TIMEOUT_MINUTES = 10;

export async function limparSessoesExpiradas() {
  const tenantId = getConnectionState().tenantId;
  if (!tenantId) {
    logger.debug("Nenhum WhatsApp conectado, pulando limpeza de sessões");
    return;
  }

  const limite = new Date(Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000).toISOString();
  const limiteAtendente = new Date(Date.now() - ATENDENTE_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  const { data: emFluxo, error: queryError } = await supabaseAdmin
    .from("chatbot_session")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .lt("ultima_atividade", limite)
    .neq("state", "MENU_PRINCIPAL")
    .neq("state", "FALANDO_COM_ATENDENTE");

  if (queryError) {
    logger.warn({ err: queryError }, "Erro ao buscar sessões expiradas");
    return;
  }

  for (const sess of (emFluxo ?? [])) {
    await supabaseAdmin
      .from("chatbot_session")
      .update({
        state: "MENU_PRINCIPAL",
        state_data: {},
        ultima_atividade: new Date().toISOString(),
      })
      .eq("id", sess.id);

    logger.info({ sessionId: sess.id }, "Sessão em fluxo expirada reiniciada para MENU_PRINCIPAL");
  }

  const { data: atendenteExpiradas } = await supabaseAdmin
    .from("chatbot_session")
    .select("id, remote_jid")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .eq("state", "FALANDO_COM_ATENDENTE")
    .lt("ultima_atividade", limiteAtendente);

  for (const sess of (atendenteExpiradas ?? [])) {
    const { data: atendenteRespondeu } = await supabaseAdmin
      .from("chatbot_mensagem")
      .select("id")
      .eq("session_id", sess.id)
      .eq("remetente", "atendente")
      .limit(1);

    if ((atendenteRespondeu?.length ?? 0) > 0) continue;

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
      "⏳ Parece que o atendente está demorando. O bot está de volta! Como posso ajudar?",
      "bot",
      tenantId
    ).catch(() => {});

    logger.info({ sessionId: sess.id }, "Sessão FALANDO_COM_ATENDENTE expirada, voltou ao MENU_PRINCIPAL");
  }

  logger.info({ quantidade: (emFluxo?.length ?? 0) + (atendenteExpiradas?.length ?? 0) }, "Sessões expiradas reiniciadas");
}
