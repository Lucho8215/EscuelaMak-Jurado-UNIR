/**
 * API GATEWAY — EscuelaMak
 *
 * Punto de entrada único para todos los microservicios.
 * Aplica seguridad antes de reenviar cada petición al servicio correspondiente.
 *
 * Flujo de una petición:
 *   Cliente → [Helmet] → [CORS] → [Rate Limit] → [JWT Auth] → [Proxy al servicio]
 */

import express from 'express';
import dotenv from 'dotenv';
import { applySecurityMiddleware } from './middleware/security.middleware';
import { applyRateLimit } from './middleware/rateLimit.middleware';
import { applyCors } from './middleware/cors.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { setupRoutes } from './routes/proxy.routes';
import { logger } from './utils/logger';

// Cargar variables de entorno ANTES de cualquier otra importación
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// CAPA 1: Middleware de seguridad global
// Se aplican en orden: cada uno puede rechazar la petición antes de continuar
// ─────────────────────────────────────────────

// 1. Headers de seguridad HTTP (Helmet: XSS, Clickjacking, MIME sniffing, etc.)
applySecurityMiddleware(app);

// 2. CORS — define qué dominios pueden llamar a este API
applyCors(app);

// 3. Rate Limiting — protege contra fuerza bruta y DDoS
applyRateLimit(app);

// 4. Body parser — limita tamaño de payload para evitar ataques de payload grande
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────
// CAPA 2: Logging de auditoría
// Registra TODAS las peticiones con IP, método, ruta y timestamp
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      ip: req.ip,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

// ─────────────────────────────────────────────
// CAPA 3: Health check (sin autenticación)
// Permite verificar que el gateway está vivo sin exponer datos
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─────────────────────────────────────────────
// CAPA 4: Rutas públicas (sin JWT)
// Solo autenticación: login y registro no requieren token previo
// ─────────────────────────────────────────────
setupRoutes(app, { authMiddleware });

// ─────────────────────────────────────────────
// CAPA 5: Manejador de errores global
// NUNCA exponemos stack traces al cliente en producción
// ─────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, path: req.path, method: req.method });

  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Internal server error',
    // En desarrollo mostramos el mensaje para depuración, en producción no
    ...(isDev && { detail: err.message }),
  });
});

// ─────────────────────────────────────────────
// CAPA 6: Ruta no encontrada
// ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`🚀 API Gateway corriendo en http://localhost:${PORT}`);
  logger.info(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
