import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";
import { getConnectionState, sendWhatsAppMessage } from "../chatbot/baileys.client.js";
import { criarNotificacao } from "./notificacoes.service.js";
import { dataLocalISO } from "../utils/data.js";

const INTERVALO_MS = 4000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function montarMensagem(nomeEmpresa, texto) {
  return `📢 *${nomeEmpresa}*\n\n${texto.trim()}`;
}

async function buscarDestinatarios(tenantId, filtro) {
  if (filtro === "chatbot") {
    const { data: sessoes, error } = await supabaseAdmin
      .from("chatbot_session")
      .select("client_name, remote_jid")
      .eq("tenant_id", tenantId)
      .eq("ativo", true);

    if (error) throw new AppError(`Erro ao buscar sessões do chatbot: ${error.message}`);

    const vistos = new Set();
    return (sessoes ?? [])
      .filter((s) => {
        if (!s.remote_jid || vistos.has(s.remote_jid)) return false;
        vistos.add(s.remote_jid);
        return true;
      })
      .map((s) => ({
        cliente_id: null,
        cliente_nome: s.client_name || "Cliente",
        telefone: null,
        jid: s.remote_jid,
      }));
  }

  let query = supabaseAdmin
    .from("clientes")
    .select("cliente_id, nome, telefone")
    .eq("tenant_id", tenantId)
    .not("telefone", "is", null)
    .is("deletado_em", null);

  if (filtro === "agendados") {
    query = query
      .select("cliente_id, nome, telefone, agendamentos!inner(agendamento_id)")
      .gte("agendamentos.data_agendamento", dataLocalISO(new Date()))
      .in("agendamentos.status", ["agendado", "confirmado"]);
  }

  const { data: clientes, error } = await query;
  if (error) throw new AppError(`Erro ao buscar clientes: ${error.message}`);

  const vistos = new Set();
  return (clientes ?? [])
    .filter((c) => {
      if (vistos.has(c.cliente_id)) return false;
      vistos.add(c.cliente_id);
      return true;
    })
    .map((c) => ({
      cliente_id: c.cliente_id,
      cliente_nome: c.nome,
      telefone: c.telefone,
      jid: `55${c.telefone.replace(/\D/g, "")}@s.whatsapp.net`,
    }));
}

export async function processarDisparo(comunicadoId, tenantId, nomeEmpresa, mensagem, delayMs = INTERVALO_MS) {
  const { data: destinatarios, error } = await supabaseAdmin
    .from("comunicados_destinatarios")
    .select("*")
    .eq("comunicado_id", comunicadoId)
    .eq("status", "pendente");

  if (error) {
    logger.error({ err: error }, "Erro ao carregar destinatários do disparo");
    return;
  }

  let enviados = 0;
  let falhas = 0;

  for (const dest of destinatarios ?? []) {
    const connState = getConnectionState();
    if (connState.status !== "connected" || connState.tenantId !== tenantId) {
      falhas += destinatarios.length - enviados - falhas;
      await supabaseAdmin
        .from("comunicados_destinatarios")
        .update({ status: "falha", erro: "WhatsApp desconectado durante o envio" })
        .eq("comunicado_id", comunicadoId)
        .eq("status", "pendente");
      break;
    }

    try {
      await sendWhatsAppMessage(dest.jid, montarMensagem(nomeEmpresa, mensagem));
      await supabaseAdmin
        .from("comunicados_destinatarios")
        .update({ status: "enviado", enviado_em: new Date().toISOString() })
        .eq("id", dest.id);
      enviados += 1;
    } catch (err) {
      logger.warn({ err, comunicadoId }, "Falha ao enviar comunicado para destinatário");
      await supabaseAdmin
        .from("comunicados_destinatarios")
        .update({ status: "falha", erro: err.message?.slice(0, 200) })
        .eq("id", dest.id);
      falhas += 1;
    }

    await supabaseAdmin
      .from("comunicados")
      .update({ enviados, falhas })
      .eq("comunicado_id", comunicadoId);

    if (delayMs > 0) await sleep(delayMs);
  }

  const statusFinal = falhas > 0 && enviados === 0 ? "falhou" : falhas > 0 ? "concluido_com_falhas" : "concluido";
  await supabaseAdmin
    .from("comunicados")
    .update({ status: statusFinal, enviados, falhas, concluido_em: new Date().toISOString() })
    .eq("comunicado_id", comunicadoId);

  try {
    await criarNotificacao({
      tenantId,
      tipo: "comunicado",
      titulo: `Comunicado finalizado (${enviados} enviados${falhas > 0 ? `, ${falhas} falhas` : ""})`,
      mensagem: "O disparo de comunicado via WhatsApp foi concluído.",
      referenciaTipo: "comunicado",
      referenciaId: String(comunicadoId),
    });
  } catch (err) {
    logger.warn({ err }, "Erro ao notificar conclusão do disparo");
  }
}

export async function criarComunicado({ tenantId, nomeEmpresa, mensagem, filtro }) {
  const connState = getConnectionState();
  if (connState.status !== "connected" || connState.tenantId !== tenantId) {
    throw new AppError("Conecte o WhatsApp antes de enviar comunicados", 400);
  }

  const { data: emAndamento } = await supabaseAdmin
    .from("comunicados")
    .select("comunicado_id")
    .eq("tenant_id", tenantId)
    .eq("status", "enviando")
    .maybeSingle();

  if (emAndamento) {
    throw new AppError("Já existe um comunicado sendo enviado. Aguarde a conclusão.", 409);
  }

  const destinatarios = await buscarDestinatarios(tenantId, filtro);

  if (destinatarios.length === 0) {
    throw new AppError("Nenhum destinatário encontrado para o filtro selecionado", 400);
  }

  const { data: comunicado, error } = await supabaseAdmin
    .from("comunicados")
    .insert({
      tenant_id: tenantId,
      mensagem: mensagem.trim(),
      filtro,
      total_destinatarios: destinatarios.length,
      status: "enviando",
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao registrar comunicado: ${error.message}`);

  const rows = destinatarios.map((d) => ({
    comunicado_id: comunicado.comunicado_id,
    tenant_id: tenantId,
    ...d,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("comunicados_destinatarios")
    .insert(rows);

  if (insertError) {
    await supabaseAdmin.from("comunicados").update({ status: "falhou" }).eq("comunicado_id", comunicado.comunicado_id);
    throw new AppError(`Erro ao registrar destinatários: ${insertError.message}`);
  }

  processarDisparo(comunicado.comunicado_id, tenantId, nomeEmpresa, comunicado.mensagem).catch((err) =>
    logger.error({ err, comunicadoId: comunicado.comunicado_id }, "Erro no processamento do disparo")
  );

  return { ...comunicado, mensagem_montada: montarMensagem(nomeEmpresa, mensagem) };
}

export async function listarComunicados(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("comunicados")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: false })
    .limit(20);

  if (error) throw new AppError(`Erro ao listar comunicados: ${error.message}`);
  return data ?? [];
}
