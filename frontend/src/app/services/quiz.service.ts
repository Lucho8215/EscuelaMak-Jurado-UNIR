import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Quiz, Question, QuizAttempt, QuizAssignment, StudentQuiz, QuizResourceRequest } from '../models/quiz.model';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
    private readonly assignmentsTable = 'quiz_assignments';

 
    private supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  // ─── Obtener todos los quizzes con sus preguntas ─────────────────────────
  getQuizzes(): Observable<Quiz[]> {
    return from(
      this.supabase
        .from('quizzes')
        .select(`*, questions (*)`)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data || []).map((q: any) => this.mapToQuiz(q));
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Obtener quizzes disponibles para estudiantes ─────────────────────────
  getVisibleQuizzes(): Observable<Quiz[]> {
    return from(
      this.supabase
        .from('quizzes')
        .select(`*, questions (*)`)
        .eq('is_enabled', true)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data || []).map((q: any) => this.mapToQuiz(q));
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Obtener un quiz por ID con sus preguntas ────────────────────────────
  getQuiz(id: string): Observable<Quiz | undefined> {
    return from(
      this.supabase
        .from('quizzes')
        .select(`*, questions (*)`)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) return undefined;
        return data ? this.mapToQuiz(data) : undefined;
      }),
      catchError(() => from([undefined]))
    );
  }

  // ─── Crear quiz y guardar preguntas en Supabase ──────────────────────────
  createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Observable<Quiz> {
    return from(
      this.supabase
        .from('quizzes')
        .insert([{
          title:         quiz.title,
          description:   quiz.description,
          category:      quiz.category,
          difficulty:    quiz.difficulty,
          time_limit:    quiz.timeLimit,
          passing_score: quiz.passingScore,
          is_enabled:    quiz.isEnabled,
          is_visible:   quiz.isVisible ?? true,
          created_by:    quiz.createdBy
        }])
        .select()
        .single()
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw new Error(error.message);
        const quizId = data.id;

        if (!quiz.questions || quiz.questions.length === 0) {
          return from(Promise.resolve({ ...data, questions: [] }));
        }

        const questionsToInsert = quiz.questions.map((q, index) => ({
          quiz_id:        quizId,
          text:           q.text,
          options:        JSON.stringify(q.options),
          correct_answer: q.correctAnswer,
          explanation:    q.explanation || '',
          points:         q.points || 10,
          order_number:   index + 1
        }));

        return from(
          this.supabase
            .from('questions')
            .insert(questionsToInsert)
            .select()
            .then(({ data: qData, error: qError }) => {
              if (qError) throw new Error(qError.message);
              return { ...data, questions: qData || [] };
            })
        );
      }),
      map((data: any) => this.mapToQuiz(data)),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Actualizar quiz y sus preguntas ─────────────────────────────────────
  updateQuiz(id: string, quiz: Partial<Quiz>): Observable<Quiz> {
    return from(
      this.supabase
        .from('quizzes')
        .update({
          title:         quiz.title,
          description:   quiz.description,
          category:      quiz.category,
          difficulty:    quiz.difficulty,
          time_limit:    quiz.timeLimit,
          passing_score: quiz.passingScore,
          is_enabled:    quiz.isEnabled,
          is_visible:    quiz.isVisible,
          updated_at:    new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) throw new Error(error.message);

        if (!quiz.questions || quiz.questions.length === 0) {
          return from(Promise.resolve({ ...data, questions: [] }));
        }

        return from(
          this.supabase
            .from('questions')
            .delete()
            .eq('quiz_id', id)
            .then(async () => {
              const questionsToInsert = quiz.questions!.map((q, index) => ({
                quiz_id:        id,
                text:           q.text,
                options:        JSON.stringify(q.options),
                correct_answer: q.correctAnswer,
                explanation:    q.explanation || '',
                points:         q.points || 10,
                order_number:   index + 1
              }));

              const { data: qData, error: qError } = await this.supabase
                .from('questions')
                .insert(questionsToInsert)
                .select();

              if (qError) throw new Error(qError.message);
              return { ...data, questions: qData || [] };
            })
        );
      }),
      map((data: any) => this.mapToQuiz(data)),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Eliminar un quiz ───────────────────────────────────────────────────
  deleteQuiz(id: string): Observable<void> {
    return from(
      this.supabase
        .from('quizzes')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Activar o desactivar un quiz ───────────────────────────────────────
  toggleQuizStatus(id: string): Observable<Quiz> {
    return from(
      this.supabase
        .from('quizzes')
        .select('id, is_enabled')
        .eq('id', id)
        .single()
        .then(async ({ data, error }) => {
          if (error || !data) throw new Error('Quiz no encontrado');
          const { data: updated, error: updateError } = await this.supabase
            .from('quizzes')
            .update({
              is_enabled: !data.is_enabled,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`*, questions (*)`)
            .single();
          if (updateError) throw new Error(updateError.message);
          return updated;
        })
    ).pipe(
      map((data: any) => this.mapToQuiz(data)),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Guardar resultado del alumno ────────────────────────────────────────
  saveAttempt(attempt: Omit<QuizAttempt, 'id'>): Observable<QuizAttempt> {
    return from(
      this.supabase
        .from('quiz_attempts')
        .insert([{
          quiz_id:           attempt.quizId,
          student_id:        attempt.userId,
          score:             attempt.score,
          passed:            attempt.score >= 60,
          answers:           JSON.stringify(attempt.answers),
          started_at:        attempt.startedAt,
          completed_at:      attempt.completedAt,
          time_spent_seconds: attempt.timeSpentSeconds || 0
        }])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return {
          id:          data.id,
          quizId:      data.quiz_id,
          userId:      data.student_id,
          score:       data.score,
          passed:      data.passed,
          answers:     JSON.parse(data.answers || '[]'),
          startedAt:   new Date(data.started_at),
          completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
          timeSpentSeconds: data.time_spent_seconds,
          status:      data.passed ? 'completed' : 'completed'
        } as QuizAttempt;
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // Obtiene TODOS los intentos de TODOS los estudiantes
  // Solo para admin y profesor
  getAllAttempts(): Observable<any[]> {
    return from(
      this.supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (id, title),
          app_users (id, name, email)
        `)
        .order('completed_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data || []).map((item: any) => ({
          ...item,
          studentName: item.app_users?.name || 'Sin nombre',
          studentEmail: item.app_users?.email || ''
        }));
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  
  }

  // ─── Obtener intentos de un quiz específico ──────────────────────────────
  getQuizAttempts(quizId: string): Observable<any[]> {
    return from(
      this.supabase
        .from('quiz_attempts')
        .select(`*, quizzes (title, passing_score), app_users (name, email)`)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return data || [];
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Asignar quiz a un estudiante ───────────────────────────────────────
  assignQuizToStudent(
  quizId: string,
  studentId: string,
  assignedBy: string,
  dueDate?: Date
): Observable<QuizAssignment> {
  const payload = {
    quiz_id: quizId,
    student_id: studentId,
    assigned_by: assignedBy,
    due_date: dueDate ? dueDate.toISOString() : null,
    is_completed: false
  };
  

  return from(
    this.supabase
      .from('quiz_assignments')
      .upsert([payload], { onConflict: 'quiz_id,student_id' })
      .select()
      .single()
  ).pipe(
    map(({ data, error }) => {
      if (error) {
        throw new Error(error.message);
      }
      return this.mapToAssignment(data);
    }),
    catchError((error) => {
      console.error('Error en assignQuizToStudent:', error);
      return throwError(() => new Error(error.message || 'No se pudo asignar el quiz'));
    })
  );
}

  // ─── Asignar quiz a múltiples estudiantes ───────────────────────────────
  assignQuizToStudents
   (quizId: string,
    studentIds: string[], 
    assignedBy: string, 
    dueDate?: Date): Observable<QuizAssignment[]> 
    
    {
    const assignments = studentIds.map(studentId => ({
      quiz_id:      quizId,
      student_id:   studentId,
      assigned_by:  assignedBy,
      due_date:     dueDate || null,
      is_completed: false
    }));

    return from(
      this.supabase
        .from('quiz_assignments')
        .upsert(assignments, { onConflict: 'quiz_id,student_id' })
        .select()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data || []).map((d: any) => this.mapToAssignment(d));
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Obtener quizzes asignados a un estudiante ─────────────────────────
  getStudentQuizzes(userId: string): Observable<StudentQuiz[]> {
    return from(
      this.supabase
        .from('quiz_assignments')
        .select(`
          id,
          quiz_id,
          assigned_at,
          due_date,
          is_completed,
          completed_at,
          quizzes (
            id,
            title,
            description,
            category,
            difficulty,
            time_limit,
            passing_score,
            questions (id)
          ),
          quiz_attempts (
            id,
            score,
            completed_at
          )
        `)
        .eq('student_id', userId)
        .order('assigned_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        
        return (data || []).map((item: any) => {
          const quiz = item.quizzes;
          const attempts = item.quiz_attempts || [];
          const bestScore = attempts.length > 0 
            ? Math.max(...attempts.map((a: any) => a.score)) 
            : undefined;
          
          return {
            id: item.id,
            quizId: item.quiz_id,
            title: quiz?.title || '',
            description: quiz?.description || '',
            category: quiz?.category || 'general',
            difficulty: quiz?.difficulty || 'medium',
            timeLimit: quiz?.time_limit || 10,
            passingScore: quiz?.passing_score || 60,
            questionsCount: quiz?.questions?.length || 0,
            assignedAt: item.assigned_at ? new Date(item.assigned_at) : undefined,
            dueDate: item.due_date ? new Date(item.due_date) : undefined,
            isCompleted: item.is_completed,
            bestScore: bestScore,
            lastAttemptDate: attempts.length > 0 
              ? new Date(Math.max(...attempts.map((a: any) => new Date(a.completed_at).getTime()))) 
              : undefined,
            attemptCount: attempts.length
          } as StudentQuiz;
        });
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Obtener estudiantes asignados a un quiz ───────────────────────────
  getQuizAssignments(quizId: string): Observable<QuizAssignment[]> {
    return from(
      this.supabase
        .from('quiz_assignments')
        .select(`
          *,
          app_users (id, name, email),
          quiz_attempts (id, score, passed, completed_at)
        `)
        .eq('quiz_id', quizId)
        .order('assigned_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        
        return (data || []).map((item: any) => {
          const attempts = item.quiz_attempts || [];
          const bestScore = attempts.length > 0 
            ? Math.max(...attempts.map((a: any) => a.score)) 
            : undefined;
          
          return {
            id: item.id,
            quizId: item.quiz_id,
            studentId: item.student_id,
            assignedBy: item.assigned_by,
            dueDate: item.due_date ? new Date(item.due_date) : undefined,
            isCompleted: item.is_completed,
            assignedAt: new Date(item.assigned_at),
            completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
            student: item.app_users ? {
              id: item.app_users.id,
              name: item.app_users.name,
              email: item.app_users.email
            } : undefined,
            bestScore: bestScore
          } as QuizAssignment;
        });
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Eliminar asignación de quiz ────────────────────────────────────────
  removeQuizAssignment(assignmentId: string): Observable<void> {
    return from(
      this.supabase
        .from('quiz_assignments')
        .delete()
        .eq('id', assignmentId)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Obtener todos los estudiantes ─────────────────────────────────────
  getStudents(): Observable<any[]> {
    return from(
      this.supabase
        .from('app_users')
        .select('id, name, email, cedula')
        .eq('role', 'student')
        .order('name', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return data || [];
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Marcar asignación como completada ─────────────────────────────────
  markAssignmentComplete(assignmentId: string): Observable<void> {
    return from(
      this.supabase
        .from('quiz_assignments')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLICITUDES DE RECURSOS - Sistema para que estudiantes soliciten recursos
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crea una nueva solicitud de recurso
   * @param request Datos de la solicitud
   */
  createResourceRequest(request: Omit<QuizResourceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Observable<QuizResourceRequest> {
    return from(
      this.supabase
        .from('quiz_resource_requests')
        .insert([{
          quiz_id: request.quizId,
          student_id: request.studentId,
          question_id: request.questionId || null,
          request_type: request.requestType,
          description: request.description,
          status: 'pending'
        }])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return this.mapToResourceRequest(data);
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  /**
   * Obtiene las solicitudes de recursos de un estudiante
   * @param studentId ID del estudiante
   */
  getStudentResourceRequests(studentId: string): Observable<QuizResourceRequest[]> {
    return from(
      this.supabase
        .from('quiz_resource_requests')
        .select(`
          *,
          quizzes (id, title),
          questions (id, text)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data || []).map((item: any) => this.mapToResourceRequest(item));
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  /**
   * Obtiene todas las solicitudes de recursos (para profesores/admin)
   * @param quizId Opcional: filtrar por quiz
   */
  getAllResourceRequests(quizId?: string): Observable<QuizResourceRequest[]> {
    let query = this.supabase
      .from('quiz_resource_requests')
      .select(`
        *,
        app_users (id, name, email),
        quizzes (id, title),
        questions (id, text)
      `)
      .order('created_at', { ascending: false });

    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data || []).map((item: any) => this.mapToResourceRequest(item));
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  /**
   * Responde a una solicitud de recurso (profesor/admin)
   * @param requestId ID de la solicitud
   * @param response Respuesta del profesor
   * @param status Nuevo estado
   * @param responderId ID de quien responde
   */
  respondToResourceRequest(
    requestId: string,
    response: string,
    status: 'approved' | 'rejected' | 'completed',
    responderId: string
  ): Observable<QuizResourceRequest> {
    return from(
      this.supabase
        .from('quiz_resource_requests')
        .update({
          response: response,
          status: status,
          responded_by: responderId,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return this.mapToResourceRequest(data);
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  /**
   * Obtiene el conteo de solicitudes pendientes
   */
  getPendingRequestsCount(): Observable<number> {
    return from(
      this.supabase
        .from('quiz_resource_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ).pipe(
      map(({ count, error }) => {
        if (error) throw new Error(error.message);
        return count || 0;
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  // ─── Convertir datos de Supabase al modelo Quiz ──────────────────────────
  private mapToQuiz(data: any): Quiz {
    return {
      id:           data.id,
      title:        data.title,
      description:  data.description,
      category:     data.category,
      difficulty:   data.difficulty as 'easy' | 'medium' | 'hard',
      timeLimit:    data.time_limit,
      passingScore: data.passing_score,
      isEnabled:    data.is_enabled,
      isVisible:    data.is_visible ?? true,
      createdBy:    data.created_by,
      createdAt:    new Date(data.created_at),
      updatedAt:    new Date(data.updated_at),
      questions:    (data.questions || []).map((q: any) => ({
        id:            q.id,
        text:          q.text,
        options:       Array.isArray(q.options)
                         ? q.options
                         : JSON.parse(q.options || '[]'),
        correctAnswer: q.correct_answer,
        explanation:   q.explanation,
        points:        q.points,
        orderNumber:   q.order_number
      } as Question))
    };
  }

  // ─── Convertir datos de Supabase al modelo Assignment ───────────────────
  private mapToAssignment(data: any): QuizAssignment {
    return {
      id:           data.id,
      quizId:       data.quiz_id,
      studentId:    data.student_id,
      assignedBy:   data.assigned_by,
      dueDate:      data.due_date ? new Date(data.due_date) : undefined,
      isCompleted:  data.is_completed,
      assignedAt:   new Date(data.assigned_at),
      completedAt:  data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Método auxiliar para convertir datos de recurso al modelo
  // ═══════════════════════════════════════════════════════════════════════════
  private mapToResourceRequest(data: any): QuizResourceRequest {
    return {
      id:           data.id,
      quizId:       data.quiz_id,
      studentId:    data.student_id,
      questionId:   data.question_id || undefined,
      requestType:  data.request_type,
      description:  data.description,
      status:       data.status,
      response:     data.response || undefined,
      respondedBy:  data.responded_by || undefined,
      respondedAt:  data.responded_at ? new Date(data.responded_at) : undefined,
      createdAt:    new Date(data.created_at),
      updatedAt:    new Date(data.updated_at),
      // Datos relacionados
      student: data.app_users ? {
        id:    data.app_users.id,
        name:  data.app_users.name,
        email: data.app_users.email
      } : undefined,
      quiz: data.quizzes ? {
        id:    data.quizzes.id,
        title: data.quizzes.title
      } : undefined,
      question: data.questions ? {
        id:   data.questions.id,
        text: data.questions.text
      } : undefined
    };
  }
}
