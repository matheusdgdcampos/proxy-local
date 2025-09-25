import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';

// Garante que o diretório de logs existe
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuração do logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'ts-mock-proxy' },
  transports: [
    // Escreve logs de erro em error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    // Escreve logs de todos os níveis em combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
    // Saída para console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const { timestamp, level, message, ...rest } = info;
          return `${timestamp} ${level}: ${message} ${
            Object.keys(rest).length ? JSON.stringify(rest, null, 2) : ''
          }`;
        }),
      ),
    }),
  ],
});

// Exporta funções de log para uso em toda a aplicação
export default {
  info: (message: string, meta?: Record<string, unknown>) =>
    logger.info(message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    logger.warn(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    logger.debug(message, meta),
  http: (message: string, meta?: Record<string, unknown>) =>
    logger.http(message, meta),
};
