export class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'slot already booked' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  for (const [name, value] of Object.entries(err.headers || {})) {
    res.set(name, String(value));
  }
  return res.status(status).json({ error: err.message || 'internal server error' });
}
