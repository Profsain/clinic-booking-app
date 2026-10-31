import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { router } from './routes.js';
import { errorHandler } from './utils/errors.js';

// This function creates and configures an Express application. It sets up security headers, CORS policies, JSON body parsing, and health check routes. It also allows for optional middleware to be executed before the main routes are registered. Finally, it includes error handling and a catch-all route for 404 Not Found responses.
export function createApp({ beforeRoutes } = {}) {
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
  if (beforeRoutes) app.use(beforeRoutes);
  app.use('/', router);
  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  app.use(errorHandler);
  return app;
}
