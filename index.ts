import express from 'express';
import { appConfig } from './config';
import { UniverseManager } from './universe';

const app = express();
const manager = new UniverseManager();

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'memepulse-live-universe',
    chainId: appConfig.chainId,
    now: new Date().toISOString(),
  });
});

app.get('/api/live-universe', (_req, res) => {
  res.json(manager.getSnapshot());
});

app.get('/api/debug/candidates', (_req, res) => {
  const snapshot = manager.getSnapshot();
  res.json({
    status: snapshot.status,
    counts: snapshot.counts,
    topTen: snapshot.items.slice(0, 10),
  });
});

async function bootstrap() {
  await manager.initialize();
  manager.start();

  app.listen(appConfig.port, '0.0.0.0', () => {
    console.log(
      `MemePulse live-universe API running on http://0.0.0.0:${appConfig.port}`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
