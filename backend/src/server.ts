import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { sessionPool } from './config/session';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(
    `[EMRMS Backend] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
  );
});

async function shutdown(signal: string) {
  console.log(`[EMRMS Backend] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    await sessionPool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
