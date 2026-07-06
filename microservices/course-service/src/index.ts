/**
 * COURSE SERVICE — EscuelaMak
 *
 * Microservicio responsable de:
 *   - CRUD de cursos
 *   - CRUD de clases (grupos)
 *   - Matrículas de estudiantes
 *   - Lecciones y contenido
 *
 * Solo acepta peticiones del API Gateway (INTERNAL_API_KEY).
 * La autorización por rol se hace en el Gateway antes de llegar aquí.
 */

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { internalAuthMiddleware } from './middleware/internal.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(internalAuthMiddleware);

// ─── Supabase client (read-only para este servicio en casos públicos) ───
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Schemas de validación ───
const courseSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  isActive: z.boolean().optional().default(true),
});

const classSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(3).max(200).trim(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'course-service' });
});

// ─── GET /api/courses ─── Listar cursos
app.get('/api/courses', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, description, is_active, created_at')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

// ─── GET /api/courses/:id ─── Detalle de un curso
app.get('/api/courses/:id', async (req, res) => {
  const { id } = req.params;

  // Validar que el ID es un UUID válido para prevenir injection
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id, name, description, is_active, created_at,
        classes (id, name, start_date, end_date)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Curso no encontrado' });
      return;
    }

    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Error al obtener curso' });
  }
});

// ─── POST /api/courses ─── Crear curso (solo ADMIN/TEACHER, verificado en Gateway)
app.post('/api/courses', async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('courses')
      .insert({ name: parsed.data.name, description: parsed.data.description, is_active: parsed.data.isActive })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch {
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

// ─── PUT /api/courses/:id ─── Actualizar curso
app.put('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('courses')
      .update({ name: parsed.data.name, description: parsed.data.description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Error al actualizar curso' });
  }
});

// ─── DELETE /api/courses/:id ─── Eliminar curso (solo ADMIN, verificado en Gateway)
app.delete('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const supabase = getSupabase();
    // Soft delete: marcar como inactivo en lugar de eliminar
    const { error } = await supabase
      .from('courses')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Curso desactivado exitosamente' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar curso' });
  }
});

// ─── POST /api/courses/classes ─── Crear clase
app.post('/api/courses/classes', async (req, res) => {
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('classes')
      .insert({
        course_id: parsed.data.courseId,
        name: parsed.data.name,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch {
    res.status(500).json({ error: 'Error al crear clase' });
  }
});

app.listen(PORT, () => {
  console.log(`📚 Course Service corriendo en http://localhost:${PORT}`);
});

export default app;
