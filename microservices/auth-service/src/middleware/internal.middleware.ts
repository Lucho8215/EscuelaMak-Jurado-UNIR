/**
 * MIDDLEWARE DE AUTENTICACIÓN INTERNA
 *
 * Los microservicios no deben ser accesibles directamente desde internet.
 * Este middleware verifica que la petición proviene del API Gateway
 * usando una clave interna compartida (INTERNAL_API_KEY).
 *
 * En producción, además de esta clave, se deben usar:
 *   - VPC privada (servicios no expuestos al público)
 *   - Firewall rules que solo permitan tráfico del gateway
 *
 * Esta clave se configura como variable de entorno en Vercel
 * y nunca se expone en el código.
 */

import { Request, Response, NextFunction } from 'express';

export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Permitir health check sin autenticación interna
  if (req.path === '/health') {
    next();
    return;
  }

  const internalKey = req.headers['x-internal-api-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.error('[Security] INTERNAL_API_KEY no configurado');
    res.status(500).json({ error: 'Service misconfigured' });
    return;
  }

  // Comparación timing-safe para prevenir timing attacks
  // (evita que un atacante adivine la clave midiendo el tiempo de respuesta)
  if (!internalKey || internalKey !== expectedKey) {
    res.status(403).json({ error: 'Direct access not allowed' });
    return;
  }

  next();
}
