import { getHealthStatus } from '../services/healthService.js';

export const getHealth = (req, res) => {
  const status = getHealthStatus();
  res.status(200).json(status);
};
