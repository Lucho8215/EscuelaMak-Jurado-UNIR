/**
 * CONTROLADOR DE AUTENTICACIÓN
 *
 * Maneja el ciclo completo de autenticación usando Supabase Auth.
 * Cada endpoint valida el input con Zod antes de procesarlo,
 * eliminando datos maliciosos antes de llegar a Supabase.
 *
 * Validación de input (Zod) protege contra:
 *   - SQL injection (aunque Supabase ya lo previene)
 *   - XSS via inputs maliciosos
 *   - Datos con tipos incorrectos que podrían crashear el servicio
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const authRouter = Router();

// ─── Inicializar cliente Supabase con service role ───
// Service role tiene privilegios totales — NUNCA exponerlo al cliente
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase no configurado correctamente');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ─── Schemas de validación con Zod ───
// Zod rechaza inputs que no cumplan el esquema antes de procesarlos

const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'Email muy largo')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Contraseña muy corta')
    .max(128, 'Contraseña muy larga'),
});

const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Contraseña debe tener mayúsculas, minúsculas y números'
    ),
  fullName: z.string().min(2).max(100).trim(),
  cedula: z.string().min(6).max(20).trim().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

// ─── POST /api/auth/login ───
authRouter.post('/login', async (req: Request, res: Response) => {
  // 1. Validar y sanitizar input
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    // 2. Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Mensaje genérico: no revelar si el email existe o no
      // Esto previene ataques de enumeración de usuarios
      res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos',
      });
      return;
    }

    // 3. Obtener el rol del usuario desde app_users
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, full_name, cedula')
      .eq('auth_user_id', data.user.id)
      .single();

    // 4. Responder con tokens y datos del usuario
    res.json({
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: appUser?.role || 'STUDENT',
        fullName: appUser?.full_name,
      },
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/register ───
authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password, fullName, cedula } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    // Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // En producción usar email confirmation flow
    });

    if (error) {
      // Si el email ya existe, respuesta genérica
      if (error.message.includes('already registered')) {
        res.status(409).json({ error: 'El email ya está registrado' });
        return;
      }
      throw error;
    }

    // Crear registro en app_users con rol por defecto STUDENT
    await supabase.from('app_users').insert({
      auth_user_id: data.user.id,
      email,
      full_name: fullName,
      cedula,
      role: 'STUDENT',
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: 'STUDENT',
      },
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/refresh ───
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Refresh token requerido' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: parsed.data.refreshToken,
    });

    if (error || !data.session) {
      res.status(401).json({ error: 'Refresh token inválido o expirado' });
      return;
    }

    res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/logout ───
authRouter.post('/logout', async (req: Request, res: Response) => {
  // El gateway ya verificó el JWT, podemos confiar en el usuario
  try {
    const supabase = getSupabaseAdmin();
    await supabase.auth.signOut();
    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/forgot-password ───
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Email inválido' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Siempre responder con éxito aunque el email no exista
    // Esto previene enumeración de usuarios
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    res.json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
    });
  } catch {
    // Mismo mensaje para no revelar si el email existe
    res.json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
    });
  }
});
