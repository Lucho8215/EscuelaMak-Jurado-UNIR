/**
 * MIDDLEWARE DE AUTENTICACIÓN — JWT
 *
 * Verifica que el token JWT sea válido antes de reenviar
 * la petición al microservicio correspondiente.
 *
 * Flujo:
 *   1. Extrae el token del header Authorization: Bearer <token>
 *   2. Verifica firma con la clave secreta
 *   3. Verifica que no haya expirado
 *   4. Agrega los datos del usuario al request para los servicios downstream
 *   5. Pasa al siguiente middleware si todo es válido
 *
 * Si el token es inválido, retorna 401 sin revelar por qué exactamente
 * (no dar pistas a atacantes sobre qué falló).
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender el tipo Request de Express para incluir el usuario decodificado
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        aud: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Validar formato del header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token de autorización requerido',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no configurado');
    }

    // Verificar y decodificar el token
    // jwt.verify() lanza excepción si:
    //   - La firma no coincide (token manipulado)
    //   - El token expiró
    //   - El formato es inválido
    const decoded = jwt.verify(token, secret) as {
      sub: string;
      email: string;
      role: string;
      aud: string;
    };

    // Adjuntar usuario al request para los servicios downstream
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      aud: decoded.aud,
    };

    next();
  } catch (error) {
    // Respuesta genérica: no revelar si el token expiró, fue manipulado, etc.
    // Esto dificulta ataques de enumeración
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token inválido o expirado',
    });
  }
}

// Middleware para verificar roles específicos
// Uso: requireRole('ADMIN') o requireRole('TEACHER', 'ADMIN')
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
      });
      return;
    }

    next();
  };
}
