import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    logger.error({ err }, err.message);

    if (err.statusCode >= 500) {
      return res.status(err.statusCode).json({ error: "Erro interno do servidor. Tente novamente mais tarde." });
    }

    const publicMessage =
      err.publicMessage ??
      (/^Erro\b/.test(err.message) ? "Não foi possível concluir a operação. Tente novamente." : err.message);
    return res.status(err.statusCode).json({ error: publicMessage });
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Arquivo muito grande. O limite é 25MB." });
  }

  logger.error({ err }, err.message);

  if (err?.code === "PGRST301") {
    return res.status(400).json({ error: "Requisição inválida. Verifique os dados enviados." });
  }

  if (err?.code?.startsWith("235") || err?.code?.startsWith("22")) {
    return res.status(400).json({ error: "Erro de validação dos dados. Verifique as informações." });
  }

  if (err?.code === "42P01") {
    return res.status(500).json({ error: "Erro interno do sistema. Tente novamente mais tarde." });
  }

  res.status(500).json({ error: "Erro interno do servidor. Tente novamente mais tarde." });
}
