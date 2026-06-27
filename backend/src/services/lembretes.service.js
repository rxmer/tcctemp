import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppMessage, getConnectionState } from "../chatbot/baileys.client.js";

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export async function verificarEEnviarLembretes() {
  const connState = getConnectionState();
  if (connState.status !== "connected" || !connState.tenantId) return;

  const tenantId = connState.tenantId;

  const agora = new Date();
  const daquiUmaHora = new Date(agora.getTime() + 60 * 60 * 1000);

  const hoje = agora.toISOString().split("T")[0];
  const agoraHm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const daquiHm = `${String(daquiUmaHora.getHours()).padStart(2, "0")}:${String(daquiUmaHora.getMinutes()).padStart(2, "0")}`;

  const { data: agendamentos, error } = await supabaseAdmin
    .from("agendamentos")
    .select("*, cliente:clientes!inner(*)")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmado")
    .is("lembrete_enviado", null)
    .eq("data_agendamento", hoje)
    .gte("hora_agendamento", agoraHm)
    .lte("hora_agendamento", daquiHm);

  if (error) {
    logger.error({ err: error }, "Erro ao buscar agendamentos para lembrete");
    return;
  }

  if (!agendamentos || agendamentos.length === 0) return;

  for (const ag of agendamentos) {
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
        .update({ lembrete_enviado: new Date().toISOString() })
        .eq("agendamento_id", ag.agendamento_id);
      logger.info({ agendamentoId: ag.agendamento_id, cliente: ag.cliente.nome }, "Lembrete enviado");
    } catch (err) {
      logger.error({ err, agendamentoId: ag.agendamento_id }, "Erro ao enviar lembrete");
    }
  }
}
