import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { logger } from './common/logger/logger.js';
import { markShuttingDown } from './common/runtime/state.js';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info({
      service: env.SERVICE_NAME,
      version: env.SERVICE_VERSION,
      port: env.PORT,
      environment: env.NODE_ENV
    }, 'HTTP server started');
  });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    markShuttingDown();
    logger.warn({ signal }, 'Graceful shutdown started');

    const forceExitTimer = setTimeout(() => {
      logger.error({ timeoutMs: env.GRACEFUL_SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown timed out');
      process.exit(1);
    }, env.GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    forceExitTimer.unref();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await prisma.$disconnect();
    logger.info({ signal }, 'Graceful shutdown completed');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('UNCAUGHT_EXCEPTION');
  });
}

void bootstrap();
