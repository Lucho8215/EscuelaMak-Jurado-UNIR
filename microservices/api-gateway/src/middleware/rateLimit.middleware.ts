/**
 * MIDDLEWARE DE RATE LIMITING
 *
 * Protege contra ataques de fuerza bruta y DDoS limitando
 * la cantidad de peticiones que una IP puede hacer en un período.
 *
 * Tenemos 3 limitadores con diferentes umbrales según la sensibilidad:
 *
 *   generalLimiter  → Rutas normales: 100 req / 15 min por IP
 *   authLimiter     → Login/Register: 10 req / 15 min por IP  ← más estricto
 *   apiLimiter      → Operaciones de datos: 60 req / 1 min por IP
 */

import rateLimit from 'express-rate-limit';
import { Application, Request, Response } from 'express';

// Mensaje estándar cuando se supera el límite
const rateLimitMessage = {
  error: 'Too many requests',
  message: 'Has superado el límite de peticiones. Intenta de nuevo más tarde.',
  retryAfter: 'Ver header Retry-After',
};

// ─── Limitador general (todas las rutas) ───
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Ventana: 15 minutos
  max: 100,                   // Máximo 100 peticiones por ventana
  standardHeaders: true,      // Agrega headers RateLimit-* (RFC 6585)
  legacyHeaders: false,       // Desactiva headers X-RateLimit-* obsoletos
  message: rateLimitMessage,
  // keyGenerator: Por defecto usa req.ip (IPv4 e IPv6 compatible)
  skip: (req: Request) => {
    // Nunca limitar el health check
    return req.path === '/health';
  },
});

// ─── Limitador estricto para autenticación ───
// Razón: login/register son los endpoints más atacados con fuerza bruta
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,                    // Solo 10 intentos de login por IP en 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ...rateLimitMessage,
    message: 'Demasiados intentos de autenticación. Espera 15 minutos.',
  },
  // Agrega delay exponencial (opcional, requiere configuración adicional)
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Authentication Attempts',
      message: 'Cuenta temporalmente bloqueada por seguridad. Intenta en 15 minutos.',
    });
  },
});

// ─── Limitador para operaciones de API ───
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // Ventana: 1 minuto
  max: 60,                   // 60 peticiones por minuto (1 por segundo en promedio)
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export function applyRateLimit(app: Application): void {
  // Aplica el limitador general a TODAS las rutas
  app.use(generalLimiter);

  // Los limitadores específicos se aplican en proxy.routes.ts
}
