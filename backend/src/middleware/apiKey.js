import { config } from '../config.js';

export function requireApiKey(req, res, next) {
  const supplied = req.get('X-API-Key');
  const expected = process.env.API_KEY || config.apiKey;
  if (!expected || !supplied || supplied !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
