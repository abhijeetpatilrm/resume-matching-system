export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message || "Something went wrong");

    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);

    Object.freeze(this); // prevent mutation (pro-level)
  }
}
