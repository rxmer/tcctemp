import { AppError } from "../utils/errors.js";

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode ?? 500;
  res.status(statusCode).json({
    error: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
