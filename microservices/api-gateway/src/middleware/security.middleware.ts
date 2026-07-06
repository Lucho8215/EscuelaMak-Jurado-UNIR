/**
 * MIDDLEWARE DE SEGURIDAD — Helmet
 *
 * Helmet configura automáticamente 15 headers HTTP de seguridad.
 * Cada header protege contra un tipo de ataque diferente.
 *
 * Headers que Helmet agrega:
 *
 *   Content-Security-Policy     → Previene XSS definiendo fuentes válidas de contenido
 *   X-XSS-Protection            → Activa el filtro XSS del navegador
 *   X-Frame-Options             → Previene Clickjacking (DENY: nunca en iframe)
 *   X-Content-Type-Options      → Previene MIME type sniffing
 *   Strict-Transport-Security   → Fuerza HTTPS (HSTS)
 *   Referrer-Policy             → Controla qué URL se envía como referrer
 *   Permissions-Policy          → Deshabilita APIs del navegador no necesarias
 */

import helmet from 'helmet';
import { Application } from 'express';

export function applySecurityMiddleware(app: Application): void {
  app.use(
    helmet({
      // Content Security Policy: solo permitir recursos del mismo origen
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", process.env.SUPABASE_URL || ''],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"], // Previene Clickjacking
        },
      },

      // Fuerza HTTPS por 1 año (solo en producción)
      hsts: {
        maxAge: 31536000,          // 1 año en segundos
        includeSubDomains: true,   // También aplica a subdominios
        preload: true,             // Solicita inclusión en lista HSTS de navegadores
      },

      // Deshabilita el header X-Powered-By (no revelar que usamos Express)
      hidePoweredBy: true,

      // Previene que navegadores "adivinen" el tipo de contenido
      noSniff: true,

      // Previene Clickjacking
      frameguard: { action: 'deny' },

      // Activa filtro XSS del navegador
      xssFilter: true,
    })
  );
}
