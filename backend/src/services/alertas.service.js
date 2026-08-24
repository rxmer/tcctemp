import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { criarNotificacao } from "./notificacoes.service.js";
import { dataLocalISO } from "../utils/data.js";
import { sendWhatsAppMessage, getConnectionState } from "../chatbot/baileys.client.js";

const DIAS_ANTECEDENCIA = 3;
const DIAS_PARA_COBRANCA = 3;

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function diasDeDiferenca(dataISO, refISO) {
  const data = new Date(dataISO + "T00:00:00");
  const ref = new Date(refISO + "T00:00:00");
  return Math.round((data - ref) / (24 * 60 * 60 * 1000));
}

export async function verificarContasVencendo() {
  const hoje = dataLocalISO();
  const limite = dataLocalISO(new Date(Date.now() + DIAS_ANTECEDENCIA * 24 * 60 * 60 * 1000));

  const { data: contas, error } = await supabaseAdmin
    .from("contas_pagar")
    .select("conta_id, tenant_id, descricao, valor, data_vencimento")
    .eq("pago", false)
    .is("deletado_em", null)
    .lte("data_vencimento", limite);

  if (error) {
    logger.error({ err: error }, "Erro ao buscar contas a pagar vencendo");
    return 0;
  }

  let criadas = 0;

  for (const conta of contas ?? []) {
    const { count } = await supabaseAdmin
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", conta.tenant_id)
      .eq("tipo", "conta_vencendo")
      .eq("referencia_id", String(conta.conta_id));

    if ((count ?? 0) > 0) continue;

    const dias = diasDeDiferenca(conta.data_vencimento, hoje);
    const quando =
      dias < 0
        ? `VENCIDA há ${Math.abs(dias)} dia(s)`
        : dias === 0
          ? "vence HOJE"
          : `vence em ${dias} dia(s)`;

    await criarNotificacao({
      tenantId: conta.tenant_id,
      tipo: "conta_vencendo",
      titulo: dias < 0 ? "Conta a pagar vencida" : "Conta a pagar vencendo",
      mensagem: `${conta.descricao} — R$ ${Number(conta.valor).toFixed(2)} ${quando} (${formatDateBR(conta.data_vencimento)}).`,
      referenciaTipo: "conta_pagar",
      referenciaId: String(conta.conta_id),
    });

    criadas++;
  }

  if (criadas > 0) logger.info({ criadas }, "Alertas de contas a pagar criados");
  return criadas;
}

export async function cobrarFaturamentosPendentes() {
  const connState = getConnectionState();
  if (connState.status !== "connected" || !connState.tenantId) return 0;

  const tenantId = connState.tenantId;
  const corte = new Date(Date.now() - DIAS_PARA_COBRANCA * 24 * 60 * 60 * 1000).toISOString();

  const { data: faturamentos, error } = await supabaseAdmin
    .from("faturamentos")
    .select(
      "faturamento_id, valor_total, ordem_servico:ordens_servico(agendamento:agendamentos(data_agendamento, cliente:clientes(nome, telefone)))"
    )
    .eq("tenant_id", tenantId)
    .eq("pago", false)
    .lte("criado_em", corte);

  if (error) {
    logger.error({ err: error }, "Erro ao buscar faturamentos pendentes para cobrança");
    return 0;
  }

  let enviadas = 0;

  for (const fat of faturamentos ?? []) {
    const cliente = fat.ordem_servico?.agendamento?.cliente;
    if (!cliente?.telefone) continue;

    const { count } = await supabaseAdmin
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("tipo", "cobranca_faturamento")
      .eq("referencia_id", String(fat.faturamento_id));

    if ((count ?? 0) > 0) continue;

    const phone = cliente.telefone.replace(/\D/g, "");
    const msg = [
      "💰 *Lembrete de Pagamento*",
      "",
      `Olá, *${cliente.nome ?? "Cliente"}*! Tudo bem?`,
      "",
      `Passando para lembrar que o pagamento do serviço realizado em ${formatDateBR(
        fat.ordem_servico?.agendamento?.data_agendamento
      )} ainda está pendente.`,
      "",
      `💵 *Valor:* R$ ${Number(fat.valor_total).toFixed(2)}`,
      "",
      "Se já pagou, ignore esta mensagem. Qualquer dúvida, é só chamar! 😊",
    ].join("\n");

    try {
      await sendWhatsAppMessage(`55${phone}@s.whatsapp.net`, msg);
      await criarNotificacao({
        tenantId,
        tipo: "cobranca_faturamento",
        titulo: "Cobrança enviada",
        mensagem: `Cobrança de R$ ${Number(fat.valor_total).toFixed(2)} enviada para ${cliente.nome ?? "Cliente"} (${cliente.telefone}) via WhatsApp.`,
        referenciaTipo: "faturamento",
        referenciaId: String(fat.faturamento_id),
      });
      enviadas++;
    } catch (err) {
      logger.warn({ err, faturamentoId: fat.faturamento_id }, "Falha ao enviar cobrança");
    }
  }

  if (enviadas > 0) logger.info({ enviadas }, "Cobranças de faturamento enviadas");
  return enviadas;
}

export async function fecharAgendamentosPassados() {
  const hoje = dataLocalISO();
  let cancelados = 0;
  let avisosCriados = 0;
  let limpezas = 0;

  const { data: pendentes, error } = await supabaseAdmin
    .from("agendamentos")
    .select("agendamento_id, tenant_id, data_agendamento, hora_agendamento, cliente:clientes(nome)")
    .eq("status", "pendente")
    .lt("data_agendamento", hoje)
    .is("deletado_em", null);

  if (error) {
    logger.error({ err: error }, "Erro ao buscar agendamentos pendentes passados");
  } else {
    for (const ag of pendentes ?? []) {
      const { error: updError } = await supabaseAdmin
        .from("agendamentos")
        .update({ status: "cancelado" })
        .eq("agendamento_id", ag.agendamento_id)
        .eq("tenant_id", ag.tenant_id);

      if (updError) {
        logger.error({ err: updError, agendamentoId: ag.agendamento_id }, "Erro ao cancelar agendamento passado");
        continue;
      }

      await criarNotificacao({
        tenantId: ag.tenant_id,
        tipo: "agendamento_cancelado_auto",
        titulo: "Agendamento expirado cancelado",
        mensagem: `${ag.cliente?.nome ?? "Cliente"} não confirmou o agendamento de ${formatDateBR(ag.data_agendamento)} às ${String(ag.hora_agendamento).slice(0, 5)}. Cancelado automaticamente.`,
        referenciaTipo: "agendamento",
        referenciaId: String(ag.agendamento_id),
      }).catch(() => {});

      cancelados++;
    }
  }

  const { data: confirmados, error: errConf } = await supabaseAdmin
    .from("agendamentos")
    .select("agendamento_id, tenant_id, data_agendamento, hora_agendamento, cliente:clientes(nome)")
    .eq("status", "confirmado")
    .lt("data_agendamento", hoje)
    .is("deletado_em", null);

  if (errConf) {
    logger.error({ err: errConf }, "Erro ao buscar agendamentos confirmados passados");
  } else {
    for (const ag of confirmados ?? []) {
      const { count } = await supabaseAdmin
        .from("notificacoes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", ag.tenant_id)
        .eq("tipo", "revisao_agendamento_passado")
        .eq("referencia_id", String(ag.agendamento_id));

      if ((count ?? 0) > 0) continue;

      await criarNotificacao({
        tenantId: ag.tenant_id,
        tipo: "revisao_agendamento_passado",
        titulo: "Revisar serviço realizado?",
        mensagem: `O agendamento de ${ag.cliente?.nome ?? "Cliente"} em ${formatDateBR(ag.data_agendamento)} às ${String(ag.hora_agendamento).slice(0, 5)} continua confirmado e a data já passou. Se o serviço foi feito, crie a OS e finalize para gerar o faturamento.`,
        referenciaTipo: "agendamento",
        referenciaId: String(ag.agendamento_id),
      });

      avisosCriados++;
    }
  }

  const { data: revisoes } = await supabaseAdmin
    .from("notificacoes")
    .select("notificacao_id, referencia_id")
    .eq("tipo", "revisao_agendamento_passado");

  const idsRevisao = (revisoes ?? []).map((r) => r.referencia_id).filter(Boolean);
  if (idsRevisao.length > 0) {
    const { data: agsVinculados } = await supabaseAdmin
      .from("agendamentos")
      .select("agendamento_id, status")
      .in("agendamento_id", idsRevisao);

    for (const revisao of revisoes ?? []) {
      const ag = (agsVinculados ?? []).find(
        (a) => String(a.agendamento_id) === String(revisao.referencia_id)
      );

      if (!ag || ag.status !== "confirmado") {
        await supabaseAdmin
          .from("notificacoes")
          .delete()
          .eq("notificacao_id", revisao.notificacao_id);
        limpezas++;
      }
    }
  }

  if (cancelados > 0 || avisosCriados > 0 || limpezas > 0) {
    logger.info({ cancelados, avisosCriados, limpezas }, "Fechamento de agendamentos passados executado");
  }
  return { cancelados, avisosCriados };
}

export async function enviarResumoDiario() {
  if (getConnectionState()?.status !== "connected") {
    logger.warn("WhatsApp desconectado - resumo di�rio n�o enviado");
    return { enviados: 0 };
  }

  const hoje = dataLocalISO();
  const amanha = dataLocalISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const limiteContas = dataLocalISO(new Date(Date.now() + DIAS_ANTECEDENCIA * 24 * 60 * 60 * 1000));
  const corteFaturas = new Date(Date.now() - DIAS_PARA_COBRANCA * 24 * 60 * 60 * 1000).toISOString();

  const { data: empresas, error: errEmpresas } = await supabaseAdmin
    .from("configuracao_empresa")
    .select("tenant_id, nome_fantasia, telefone")
    .neq("telefone", null);

  if (errEmpresas) {
    logger.error({ err: errEmpresas }, "Erro ao buscar empresas para o resumo di�rio");
    return { enviados: 0 };
  }

  let enviados = 0;

  for (const empresa of empresas ?? []) {
    const { tenant_id: tenantId, nome_fantasia, telefone } = empresa;
    if (!tenantId || !telefone) continue;

    const { count: jaEnviado } = await supabaseAdmin
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("tipo", "resumo_diario")
      .eq("referencia_id", hoje);

    if ((jaEnviado ?? 0) > 0) continue;

    const { data: agsAmanha } = await supabaseAdmin
      .from("agendamentos")
      .select("hora_agendamento, cliente:clientes(nome)")
      .eq("tenant_id", tenantId)
      .eq("data_agendamento", amanha)
      .in("status", ["pendente", "confirmado"])
      .is("deletado_em", null)
      .order("hora_agendamento");

    const { data: contas } = await supabaseAdmin
      .from("contas_pagar")
      .select("descricao, valor, data_vencimento")
      .eq("tenant_id", tenantId)
      .eq("pago", false)
      .is("deletado_em", null)
      .lte("data_vencimento", limiteContas);

    const { data: faturas } = await supabaseAdmin
      .from("faturamentos")
      .select("valor_total")
      .eq("tenant_id", tenantId)
      .eq("pago", false)
      .lte("criado_em", corteFaturas);

    const totalContas = (contas ?? []).reduce((soma, c) => soma + Number(c.valor || 0), 0);
    const totalFaturas = (faturas ?? []).reduce((soma, f) => soma + Number(f.valor_total || 0), 0);

    const temAgendamentos = (agsAmanha?.length ?? 0) > 0;
    const temAlertas = totalContas > 0 || totalFaturas > 0;

    let mensagem = `?? *Resumo do dia*${nome_fantasia ? ` - ${nome_fantasia}` : ""}\n\n`;

    if (temAgendamentos) {
      mensagem += `??? *Amanh� (${formatDateBR(amanha)}): ${agsAmanha.length} atendimento(s)*\n`;
      for (const ag of agsAmanha) {
        mensagem += `� ${String(ag.hora_agendamento).slice(0, 5)} - ${ag.cliente?.nome ?? "Cliente"}\n`;
      }
      mensagem += "\n";
    } else {
      mensagem += "??? Nenhum atendimento agendado para amanh�.\n\n";
    }

    if ((contas?.length ?? 0) > 0) {
      mensagem += `?? Contas a pagar em aberto: *${contas.length}* (R$ ${totalContas.toFixed(2)})\n`;
    }
    if ((faturas?.length ?? 0) > 0) {
      mensagem += `?? Faturas pendentes h� +3 dias: *${faturas.length}* (R$ ${totalFaturas.toFixed(2)})\n`;
    }
    if (!temAlertas) {
      mensagem += "? Nenhuma pend�ncia financeira no radar.\n";
    }

    try {
      await sendWhatsAppMessage(`55${String(telefone).replace(/\D/g, "")}@s.whatsapp.net`, mensagem.trim());
    } catch (err) {
      logger.warn({ err, tenantId }, "Falha ao enviar resumo di�rio por WhatsApp");
      continue;
    }

    await criarNotificacao({
      tenantId,
      tipo: "resumo_diario",
      titulo: "Resumo di�rio enviado",
      mensagem: `Resumo de ${formatDateBR(hoje)} enviado para o WhatsApp da empresa.`,
      referenciaTipo: "resumo_diario",
      referenciaId: hoje,
    });

    enviados++;
  }

  if (enviados > 0) logger.info({ enviados }, "Resumos di�rios enviados");
  return { enviados };
}
