/**
 * USER SERVICE — EscuelaMak
 *
 * Microservicio responsable de:
 *   - Gestión de perfiles de usuario
 *   - Asignación y consulta de roles
 *   - Permisos de plataforma
 *
 * Solo ADMIN puede acceder a la mayoría de endpoints.
 * El rol se verifica en el API Gateway antes de llegar aquí.
 */

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
  if (req.path === '/health') { next(); return; }
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    res.status(403).json({ error: 'Direct access not allowed' });
    return;
  }
  next();
});

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } });
}

const userUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  cedula: z.string().min(6).max(20).trim().optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'TUTOR', 'STUDENT']).optional(),
  isActive: z.boolean().optional(),
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'user-service' }));

// ─── GET /api/users ─── Listar usuarios (solo ADMIN)
app.get('/api/users', async (req, res) => {
  try {
    const supabase = getSupabase();
    const role = req.query.role as string;
    const isActive = req.query.active;

    let query = supabase
      .from('app_users')
      .select('id, email, full_name, cedula, role, is_active, created_at')
      .order('full_name');

    if (role) query = query.eq('role', role);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data, total: data?.length });
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ─── GET /api/users/:id ─── Perfil de usuario
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_users')
      .select('id, email, full_name, cedula, role, is_active, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// ─── GET /api/me ─── Perfil del usuario autenticado (cualquier rol)
app.get('/api/me', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ error: 'Usuario no identificado' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_users')
      .select('id, email, full_name, cedula, role, created_at')
      .eq('auth_user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ─── PUT /api/users/:id ─── Actualizar usuario (ADMIN)
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const supabase = getSupabase();
    const updates: Record<string, unknown> = {};
    if (parsed.data.fullName) updates.full_name = parsed.data.fullName;
    if (parsed.data.cedula) updates.cedula = parsed.data.cedula;
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

    const { data, error } = await supabase
      .from('app_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// ─── GET /api/users/:id/roles ─── Roles de un usuario
app.get('/api/users/:id/roles', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_users')
      .select('id, role, full_name')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({
      data: {
        userId: data.id,
        fullName: data.full_name,
        currentRole: data.role,
        availableRoles: ['ADMIN', 'TEACHER', 'TUTOR', 'STUDENT'],
      },
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

app.listen(PORT, () => {
  console.log(`👤 User Service corriendo en http://localhost:${PORT}`);
});

export default app;
