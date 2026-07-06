/**
 * MIDDLEWARE DE CORS (Cross-Origin Resource Sharing)
 *
 * Define qué orígenes (dominios) pueden llamar a este API.
 * Un CORS mal configurado permite que cualquier sitio web
 * haga peticiones en nombre del usuario (CSRF via XHR).
 *
 * Política:
 *   - En desarrollo: localhost permitido
 *   - En producción: solo dominios de EscuelaMak en Vercel
 */

import cors from 'cors';
import { Application } from 'express';

// Dominios autorizados para llamar al API
const ALLOWED_ORIGINS = [
  // Desarrollo local
  'http://localhost:4200',    // Angular dev server
  'http://localhost:3000',    // Gateway mismo (para pruebas)

  // Producción en Vercel (reemplaza con tu URL real)
  'https://escuelamak.vercel.app',
  'https://escuelamak-web.vercel.app',

  // Agrega aquí dominios adicionales si usas dominio propio
];

const corsOptions: cors.CorsOptions = {
  // Función que valida el origen de cada petición
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (Postman, curl, apps móviles)
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      // Log del intento de acceso no autorizado
      console.warn(`[CORS] Origen no autorizado rechazado: ${origin}`);
      callback(new Error(`Origen no autorizado por CORS: ${origin}`));
    }
  },

  // Métodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Headers que el cliente puede enviar
  allowedHeaders: [
    'Content-Type',
    'Authorization',     // Para el JWT
    'X-Requested-With',
    'Accept',
    'Origin',
  ],

  // Headers que el cliente puede leer en la respuesta
  exposedHeaders: ['RateLimit-Remaining', 'RateLimit-Reset'],

  // Permite enviar cookies entre orígenes (necesario para refresh tokens)
  credentials: true,

  // Tiempo que el navegador cachea el resultado del preflight OPTIONS
  maxAge: 86400, // 24 horas
};

export function applyCors(app: Application): void {
  app.use(cors(corsOptions));

  // Responder inmediatamente a preflight OPTIONS
  app.options('*', cors(corsOptions));
}
