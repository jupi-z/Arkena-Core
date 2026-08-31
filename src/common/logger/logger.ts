import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    environment: env.NODE_ENV
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.token',
      'req.body.refreshToken',
      'res.headers["set-cookie"]'
    ],
    censor: '[REDACTED]'
  }
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  genReqId(req: { headers: Record<string, string | string[] | undefined> }, res: { setHeader: (name: string, value: string) => void }) {
    const requestId = req.headers['x-request-id'];
    const value = Array.isArray(requestId) ? requestId[0] : requestId;
    const id = value && value.trim().length > 0 ? value : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customProps(req: { id: string | number }) {
    return {
      requestId: String(req.id)
    };
  }
} as any);
