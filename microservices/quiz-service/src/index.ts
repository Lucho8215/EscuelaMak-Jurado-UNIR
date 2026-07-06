/**
 * QUIZ SERVICE — EscuelaMak
 *
 * Microservicio responsable de:
 *   - CRUD de quizzes y preguntas
 *   - Asignación de quizzes a estudiantes
 *   - Registro de intentos y calificaciones
 *   - Consulta de resultados
 */

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(express.json({ limit: '50kb' })); // Los quizzes pueden tener mucho contenido

// Middleware de autenticación interna
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

// Schemas
const quizSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  timeLimit: z.number().int().min(1).max(240).optional(), // minutos
  passingScore: z.number().min(0).max(100).optional().default(60),
});

const attemptSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedAnswer: z.string().max(500),
  })).min(1).max(200),
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'quiz-service' }));

// ─── GET /api/quizzes ─── Listar quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Separar en dos rutas para evitar conflicto de tipos de Supabase
    if (userRole === 'STUDENT' && userId) {
      // Estudiantes solo ven sus quizzes asignados
      const { data, error } = await supabase
        .from('quiz_assignments')
        .select('quiz_id, quizzes(id, title, description, time_limit, passing_score)')
        .eq('student_id', userId);
      if (error) throw error;
      res.json({ data });
    } else {
      // Admins y profesores ven todos los quizzes
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, time_limit, passing_score, created_at');
      if (error) throw error;
      res.json({ data });
    }
  } catch {
    res.status(500).json({ error: 'Error al obtener quizzes' });
  }
});

// ─── GET /api/quizzes/:id ─── Detalle con preguntas
app.get('/api/quizzes/:id', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        id, title, description, time_limit, passing_score,
        quiz_questions (id, question_text, options, correct_answer, points)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Quiz no encontrado' });
      return;
    }

    // Para estudiantes, ocultar la respuesta correcta
    const userRole = req.headers['x-user-role'] as string;
    const questions = (data.quiz_questions as any[]) ?? [];
    const safeQuestions = userRole === 'STUDENT'
      ? questions.map((q: any) => ({ id: q.id, question_text: q.question_text, options: q.options, points: q.points }))
      : questions;

    res.json({ data: { ...data, quiz_questions: safeQuestions } });
  } catch {
    res.status(500).json({ error: 'Error al obtener quiz' });
  }
});

// ─── POST /api/quizzes ─── Crear quiz
app.post('/api/quizzes', async (req, res) => {
  const parsed = quizSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        time_limit: parsed.data.timeLimit,
        passing_score: parsed.data.passingScore,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch {
    res.status(500).json({ error: 'Error al crear quiz' });
  }
});

// ─── POST /api/quizzes/:id/attempt ─── Registrar intento de estudiante
app.post('/api/quizzes/:id/attempt', async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const parsed = attemptSchema.safeParse({ ...req.body, quizId: id });
  if (!parsed.success) {
    res.status(400).json({ error: 'Respuestas inválidas' });
    return;
  }

  const studentId = req.headers['x-user-id'] as string;
  if (!studentId) {
    res.status(401).json({ error: 'Usuario no identificado' });
    return;
  }

  try {
    const supabase = getSupabase();

    // Obtener preguntas y respuestas correctas para calcular puntaje
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer, points')
      .eq('quiz_id', id);

    if (!questions || questions.length === 0) {
      res.status(404).json({ error: 'Quiz sin preguntas' });
      return;
    }

    // Calcular puntaje
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
      totalPoints += question.points || 1;
      const studentAnswer = parsed.data.answers.find(a => a.questionId === question.id);
      if (studentAnswer?.selectedAnswer === question.correct_answer) {
        earnedPoints += question.points || 1;
      }
    }

    const score = Math.round((earnedPoints / totalPoints) * 100);

    // Guardar intento
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: id,
        student_id: studentId,
        answers: parsed.data.answers,
        score,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      data: {
        attemptId: attempt.id,
        score,
        passed: score >= 60, // passing_score del quiz
        completedAt: attempt.completed_at,
      },
    });
  } catch {
    res.status(500).json({ error: 'Error al registrar intento' });
  }
});

app.listen(PORT, () => {
  console.log(`📝 Quiz Service corriendo en http://localhost:${PORT}`);
});

export default app;
