import app from "./src/app.js";
import { initializeMySql } from "./src/database/mysql.js";
import { env } from "./src/config/env.js";
import { error as logError, info } from "./src/utils/logger.js";

// Handle sync errors
process.on("uncaughtException", (err) => {
  logError(`UNCAUGHT EXCEPTION! 💥 ${err.name}: ${err.message}`);
  process.exit(1);
});

const gracefulShutdown = (signal) => {
  info(`⚠️ ${signal} received. Starting graceful shutdown...`);

  if (!server) process.exit(1);

  server.close((shutdownError) => {
    if (shutdownError) {
      logError(`Error during server shutdown: ${shutdownError.message}`);
      process.exit(1);
    }

    info("✅ HTTP server closed successfully.");
    process.exit(0);
  });
};

// Handle termination signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle async errors
process.on("unhandledRejection", (err) => {
  logError(`UNHANDLED REJECTION! 💥 ${err.name}: ${err.message}`);

  if (!server) {
    process.exit(1);
  }

  server.close(() => {
    process.exit(1);
  });
});

let server;

const startServer = async () => {
  await initializeMySql();

  server = app.listen(env.port, () => {
    info(`🚀 Server started on port ${env.port}`);
  });
};

startServer().catch((error) => {
  logError(`Failed to start server: ${error?.message || "Unknown error"}`);
  process.exit(1);
});
