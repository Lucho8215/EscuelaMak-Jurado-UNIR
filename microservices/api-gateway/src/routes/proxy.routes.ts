/**
 * RUTAS DEL API GATEWAY — Proxy a Microservicios
 *
 * El gateway recibe la petición, aplica seguridad y la reenvía
 * al microservicio correspondiente según el prefijo de la URL.
 *
 * Mapa de rutas:
 *   /api/auth/*    → Auth Service    (puerto 3001)
 *   /api/courses/* → Course Service  (puerto 3002)
 *   /api/quizzes/* → Quiz Service    (puerto 3003)
 *   /api/users/*   → User Service    (puerto 3004)
 *
 * Rutas públicas (sin JWT):
 *   POST /api/auth/login
 *   POST /api/auth/register
 *   POST /api/auth/refresh
 *
 * Rutas protegidas (con JWT):
 *   Todas las demás
 */

import { Application } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authLimiter, apiLimiter } from '../middleware/rateLimit.middleware';
import { requireRole } from '../middleware/auth.middleware';

interface RouteConfig {
  authMiddleware: (req: any, res: any, next: any) => void;
}

// URLs de los microservicios (desde variables de entorno)
function getServiceUrl(service: string, defaultPort: number): string {
  return process.env[`${service}_URL`] || `http://localhost:${defaultPort}`;
}

export function setupRoutes(app: Application, { authMiddleware }: RouteConfig): void {
  const AUTH_SERVICE   = getServiceUrl('AUTH_SERVICE', 3001);
  const COURSE_SERVICE = getServiceUrl('COURSE_SERVICE', 3002);
  const QUIZ_SERVICE   = getServiceUrl('QUIZ_SERVICE', 3003);
  const USER_SERVICE   = getServiceUrl('USER_SERVICE', 3004);

  // ─────────────────────────────────────────
  // RUTAS PÚBLICAS — Sin autenticación JWT
  // Solo requieren rate limiting estricto
  // ─────────────────────────────────────────

  // Login: rate limit muy estricto para prevenir brute force
  app.post('/api/auth/login',
    authLimiter,
    createProxyMiddleware({ target: AUTH_SERVICE, changeOrigin: true })
  );

  // Registro de nuevo usuario
  app.post('/api/auth/register',
    authLimiter,
    createProxyMiddleware({ target: AUTH_SERVICE, changeOrigin: true })
  );

  // Renovar token con refresh token
  app.post('/api/auth/refresh',
    authLimiter,
    createProxyMiddleware({ target: AUTH_SERVICE, changeOrigin: true })
  );

  // Solicitar reset de contraseña (envía email)
  app.post('/api/auth/forgot-password',
    authLimiter,
    createProxyMiddleware({ target: AUTH_SERVICE, changeOrigin: true })
  );

  // ─────────────────────────────────────────
  // RUTAS PROTEGIDAS — Requieren JWT válido
  // ─────────────────────────────────────────

  // AUTH SERVICE — operaciones autenticadas
  app.use('/api/auth',
    authMiddleware,
    apiLimiter,
    createProxyMiddleware({ target: AUTH_SERVICE, changeOrigin: true })
  );

  // COURSE SERVICE — gestión de cursos
  // GET es público-ish (puede ver cursos sin ser admin)
  // POST/PUT/DELETE requieren rol ADMIN o TEACHER
  app.get('/api/courses*',
    authMiddleware,
    apiLimiter,
    createProxyMiddleware({ target: COURSE_SERVICE, changeOrigin: true })
  );

  app.post('/api/courses*',
    authMiddleware,
    requireRole('ADMIN', 'TEACHER'),
    apiLimiter,
    createProxyMiddleware({ target: COURSE_SERVICE, changeOrigin: true })
  );

  app.put('/api/courses*',
    authMiddleware,
    requireRole('ADMIN', 'TEACHER'),
    apiLimiter,
    createProxyMiddleware({ target: COURSE_SERVICE, changeOrigin: true })
  );

  app.delete('/api/courses*',
    authMiddleware,
    requireRole('ADMIN'),     // Solo ADMIN puede eliminar
    apiLimiter,
    createProxyMiddleware({ target: COURSE_SERVICE, changeOrigin: true })
  );

  // QUIZ SERVICE — quizzes y evaluaciones
  app.use('/api/quizzes',
    authMiddleware,
    apiLimiter,
    createProxyMiddleware({ target: QUIZ_SERVICE, changeOrigin: true })
  );

  // USER SERVICE — gestión de usuarios (solo admins)
  app.use('/api/users',
    authMiddleware,
    requireRole('ADMIN'),
    apiLimiter,
    createProxyMiddleware({ target: USER_SERVICE, changeOrigin: true })
  );

  // Perfil del usuario autenticado (cualquier rol puede ver su propio perfil)
  app.get('/api/me',
    authMiddleware,
    apiLimiter,
    createProxyMiddleware({ target: USER_SERVICE, changeOrigin: true })
  );
}
