import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Arkena Core listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void bootstrap();
