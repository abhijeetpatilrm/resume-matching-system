import { isMySqlEnabled } from "../database/mysql.js";

export const getHealthStatus = () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  database: {
    mysql: isMySqlEnabled(),
  },
});
