import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initCache } from "./config/cache.js";
import { verificarEEnviarLembretes } from "./services/lembretes.service.js";
import { limparSessoesExpiradas } from "./chatbot/chatbot.session.js";

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
});
