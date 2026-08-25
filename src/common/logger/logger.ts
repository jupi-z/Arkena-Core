import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true
} as any);
