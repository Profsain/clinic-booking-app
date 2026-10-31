import { config } from '../config.js';

// This middleware checks for the presence of a valid API key in the request headers. It compares the supplied API key with the expected value from the environment variables or configuration. If the keys do not match, it responds with a 401 Unauthorized status and an error message. If the keys match, it allows the request to proceed to the next middleware or route handler.
export function requireApiKey(req, res, next) {
  const supplied = req.get('X-API-Key');
  const expected = process.env.API_KEY || config.apiKey;
  if (!expected || !supplied || supplied !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
