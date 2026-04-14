import { env } from "../config/env.js";
import { AppError } from "./appError.js";
import { error as logError } from "./logger.js";

// Utility: validate HTTP status code
const isValidStatus = (code) => code >= 400 && code < 600;

// Normalize all errors into AppError
const normalizeError = (err) => {
  // Already structured error
  if (err instanceof AppError) {
    return err;
  }

  // Multer errors
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new AppError("File size must not exceed 2MB", 413);
    }
    return new AppError(err.message || "File upload error", 400);
  }

  // Invalid JSON body
  if (err?.name === "SyntaxError" && err?.type === "entity.parse.failed") {
    return new AppError("Invalid JSON payload", 400);
  }

  // Known HTTP-style errors
  if (
    typeof err?.statusCode === "number" &&
    err.statusCode >= 400 &&
    err.statusCode < 600
  ) {
    return new AppError(err.message || "Request failed", err.statusCode);
  }

  // Unknown error → preserve message but mark as 500
  return new AppError(err?.message || "Internal server error", 500);
};

// 404 handler
export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  const normalizedError = normalizeError(err);

  const statusCode = isValidStatus(normalizedError.statusCode)
    ? normalizedError.statusCode
    : 500;

  const isDevelopment = env.nodeEnv === "development";

  const message =
    normalizedError.isOperational && normalizedError.message
      ? normalizedError.message
      : "Internal server error";

  // Log only server errors (5xx)
  if (statusCode >= 500) {
    const errorLog = `${err?.message || "Unknown error"} | Path: ${req.originalUrl} ${req.method} | Stack: ${err?.stack || "N/A"}`;
    logError(errorLog);
  }

  const response = {
    success: false,
    status: normalizedError.status,
    message,
  };

  // Show detailed error only in development
  if (isDevelopment) {
    response.error =
      normalizedError.stack || normalizedError.message || "Unknown error";
  }

  res.status(statusCode).json(response);
};
