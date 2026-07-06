import { Request, Response, NextFunction } from 'express';

export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') { next(); return; }

  const internalKey = req.headers['x-internal-api-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey || !internalKey || internalKey !== expectedKey) {
    res.status(403).json({ error: 'Direct access not allowed' });
    return;
  }

  next();
}
