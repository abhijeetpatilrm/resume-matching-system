const formatLog = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${level}] ${timestamp} - ${message}`;
};

export const info = (message) => {
  console.log(formatLog('INFO', message));
};

export const warn = (message) => {
  console.warn(formatLog('WARN', message));
};

export const error = (message) => {
  console.error(formatLog('ERROR', message));
};