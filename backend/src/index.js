import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initCache } from "./config/cache.js";
import { verificarEEnviarLembretes } from "./services/lembretes.service.js";
import { limparSessoesExpiradas } from "./chatbot/chatbot.session.js";
import { limparNotificacoesAntigas } from "./services/notificacoes.service.js";
import {
  verificarContasVencendo,
  cobrarFaturamentosPendentes,
  fecharAgendamentosPassados,
  enviarResumoDiario,
} from "./services/alertas.service.js";

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
  process.exit(1);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM recebido, encerrando...");
  process.exit(0);
});

app.listen(env.port, async () => {
  await initCache();
  logger.info({ port: env.port }, "Backend iniciado");

  setInterval(() => {
    verificarEEnviarLembretes().catch((err) =>
      logger.error({ err }, "Erro no intervalo de lembretes")
    );
  }, 5 * 60 * 1000);

  setInterval(() => {
    limparSessoesExpiradas().catch((err) =>
      logger.error({ err }, "Erro na limpeza de sessões expiradas")
    );
  }, 5 * 60 * 1000);

  setInterval(() => {
    limparNotificacoesAntigas().catch((err) =>
      logger.error({ err }, "Erro na limpeza de notificações antigas")
    );
  }, 6 * 60 * 60 * 1000);

  setInterval(() => {
    verificarContasVencendo().catch((err) =>
      logger.error({ err }, "Erro no alerta de contas a pagar")
    );
  }, 12 * 60 * 60 * 1000);

  setTimeout(() => {
    verificarContasVencendo().catch((err) =>
      logger.error({ err }, "Erro no alerta de contas a pagar (inicial)")
    );
  }, 15 * 1000);

  setInterval(() => {
    cobrarFaturamentosPendentes().catch((err) =>
      logger.error({ err }, "Erro na cobrança de faturamentos")
    );
  }, 24 * 60 * 60 * 1000);

  setInterval(() => {
    fecharAgendamentosPassados().catch((err) =>
      logger.error({ err }, "Erro no fechamento de agendamentos passados")
    );
  }, 24 * 60 * 60 * 1000);

  setTimeout(() => {
    fecharAgendamentosPassados().catch((err) =>
      logger.error({ err }, "Erro no fechamento de agendamentos passados (inicial)")
    );
  }, 25 * 1000);

  setInterval(() => {
    enviarResumoDiario().catch((err) =>
      logger.error({ err }, "Erro no resumo diário")
    );
  }, 24 * 60 * 60 * 1000);

  setTimeout(() => {
    enviarResumoDiario().catch((err) =>
      logger.error({ err }, "Erro no resumo diário (inicial)")
    );
  }, 35 * 1000);
});
