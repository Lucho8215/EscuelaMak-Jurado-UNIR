/**
 * AUTH SERVICE — EscuelaMak
 *
 * Microservicio responsable de:
 *   - Login / Registro de usuarios
 *   - Renovación de tokens (refresh)
 *   - Logout
 *   - Reset de contraseña
 *
 * Este servicio NO debe recibir peticiones directamente del cliente.
 * Solo acepta peticiones del API Gateway (verificadas con INTERNAL_API_KEY).
 *
 * Se comunica con Supabase Auth para toda la gestión de sesiones.
 */

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { authRouter } from './controllers/auth.controller';
import { internalAuthMiddleware } from './middleware/internal.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Headers de seguridad básicos (el principal está en el gateway)
app.use(helmet());

// Solo acepta JSON
app.use(express.json({ limit: '5kb' }));

// ─── Verificar que la petición viene del API Gateway ───
// Esto evita que alguien llame directamente a este servicio
app.use(internalAuthMiddleware);

// Health check (sin autenticación interna para monitoring)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Rutas de autenticación
app.use('/api/auth', authRouter);

// Manejo de rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Manejo de errores
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Auth Service Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service corriendo en http://localhost:${PORT}`);
});

export default app;
