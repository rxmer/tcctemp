export class AppError extends Error {
  constructor(message, statusCode = 400, publicMessage) {
    super(message);
    this.statusCode = statusCode;
    if (publicMessage) this.publicMessage = publicMessage;
  }
}