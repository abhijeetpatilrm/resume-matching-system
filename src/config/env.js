import dotenv from 'dotenv';

dotenv.config();

const parsePort = (value, fallback = 3000) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT, 3000),
  mysql: {
    host: process.env.MYSQL_HOST || '',
    port: parsePort(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  },
};
