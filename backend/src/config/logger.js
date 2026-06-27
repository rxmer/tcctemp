import pino from "pino";

const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: isTest ? "silent" : process.env.LOG_LEVEL || "info",
  transport:
    !isTest && process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
