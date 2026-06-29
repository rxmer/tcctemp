import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppMessage, getConnectionState } from "../chatbot/baileys.client.js";

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const MAX_TENTATIVAS = 3;

export async function verificarEEnviarLembretes() {
  const connState = getConnectionState();
  if (connState.status !== "connected" || !connState.tenantId) return;

  const tenantId = connState.tenantId;

  const agora = new Date();
  const daquiUmaHora = new Date(agora.getTime() + 60 * 60 * 1000);

  const hoje = agora.toISOString().split("T")[0];
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const daquiMin = daquiUmaHora.getHours() * 60 + daquiUmaHora.getMinutes();

  const { data: agendamentos, error } = await supabaseAdmin
    .from("agendamentos")
    .select("*, cliente:clientes!inner(*)")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmado")
    .or(`lembrete_enviado.is.null,lembrete_tentativas.lt.${MAX_TENTATIVAS}`)
    .eq("data_agendamento", hoje);

  if (error) {
    logger.error({ err: error }, "Erro ao buscar agendamentos para lembrete");
    return;
  }

  if (!agendamentos || agendamentos.length === 0) return;

  const agendamentosFiltrados = agendamentos.filter((ag) => {
    const [h, m] = ag.hora_agendamento.split(":").map(Number);
    const agMin = h * 60 + m;

    if (daquiMin > agoraMin) {
      return agMin >= agoraMin && agMin <= daquiMin;
    } else {
      return agMin >= agoraMin || agMin <= daquiMin;
    }
  });

  if (agendamentosFiltrados.length === 0) return;

  for (const ag of agendamentosFiltrados) {
    const phoneRaw = ag.cliente?.telefone;
    if (!phoneRaw) continue;

    const phone = phoneRaw.replace(/\D/g, "");

    const { data: session, error: sessError } = await supabaseAdmin
      .from("chatbot_session")
      .select("remote_jid")
      .eq("tenant_id", tenantId)
      .eq("client_phone", phone)
      .eq("ativo", true)
      .maybeSingle();

    if (sessError || !session) continue;

    const msg = [
      "🕐 *Lembrete de Agendamento*",
      "",
      `Olá, *${ag.cliente.nome}*! Passando para lembrar do seu agendamento:`,
      "",
      `📅 *Data:* ${formatDateBR(ag.data_agendamento)}`,
      `⏰ *Horário:* ${ag.hora_agendamento.slice(0, 5)}`,
      "",
      "Estamos te esperando! 😊",
    ].join("\n");

    try {
      await sendWhatsAppMessage(session.remote_jid, msg);
      await supabaseAdmin
        .from("agendamentos")
        .update({ lembrete_enviado: new Date().toISOString(), lembrete_tentativas: 0 })
        .eq("agendamento_id", ag.agendamento_id)
        .eq("tenant_id", tenantId);
      logger.info({ agendamentoId: ag.agendamento_id, cliente: ag.cliente.nome }, "Lembrete enviado");
    } catch (err) {
      const novasTentativas = (ag.lembrete_tentativas ?? 0) + 1;
      logger.warn({ err, agendamentoId: ag.agendamento_id, tentativa: novasTentativas }, "Falha ao enviar lembrete");
      await supabaseAdmin
        .from("agendamentos")
        .update({ lembrete_tentativas: novasTentativas })
        .eq("agendamento_id", ag.agendamento_id)
        .eq("tenant_id", tenantId);
    }
  }
}
