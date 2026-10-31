import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { router } from './routes.js';
import { errorHandler } from './utils/errors.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map(v => v.trim().replace(/\/+$/, '')),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Idempotency-Key']
  }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/', router);
  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  app.use(errorHandler);
  return app;
}
