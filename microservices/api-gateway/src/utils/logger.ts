/**
 * LOGGER — Auditoría de Seguridad
 *
 * Winston logger configurado para registrar eventos de seguridad.
 * En producción, los logs van a un archivo + stdout.
 * Los logs de errores se almacenan separados para facilitar análisis.
 *
 * NUNCA loguear: passwords, tokens completos, datos personales sensibles.
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Formato para consola en desarrollo (legible por humanos)
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${typeof message === 'string' ? message : JSON.stringify(message)} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',

  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // En producción usar JSON (fácil de procesar con ELK, Datadog, etc.)
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), devFormat)
  ),

  transports: [
    // Siempre mostrar en consola
    new winston.transports.Console(),

    // En producción también guardar en archivos
    ...(process.env.NODE_ENV === 'production' ? [
      // Todos los logs de nivel info y superior
      new winston.transports.File({ filename: 'logs/combined.log' }),
      // Solo errores (para alertas de seguridad)
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    ] : []),
  ],
});
