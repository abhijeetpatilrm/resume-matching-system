import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { errorHandler, notFoundHandler } from "./utils/errorHandler.js";
import healthRoutes from "./routes/healthRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import jdRoutes from "./routes/jdRoutes.js";
import { info } from "./utils/logger.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, "../public");

// Security
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// Logging
app.use((req, res, next) => {
  info(`${req.method} ${req.originalUrl}`);
  next();
});

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Static frontend
app.use(express.static(publicDirectory));

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/jd", jdRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
