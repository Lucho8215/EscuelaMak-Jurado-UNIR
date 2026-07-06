/** Pregunta individual de un quiz. Incluye texto, opciones, respuesta correcta y explicación opcional. */
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  points: number;
  orderNumber?: number;
}

/** Cuestionario completo. Define título, preguntas, dificultad, tiempo límite y puntuación mínima para aprobar. */
export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  isEnabled: boolean;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  passingScore: number;
}

/** Intento de un estudiante al responder un quiz. Registra respuestas, puntuación y tiempo. */
export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: { questionId: string; selectedOption: number }[];
  score: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
  timeSpentSeconds?: number;
  status: 'in-progress' | 'completed' | 'abandoned';
}

/** Asignación de un quiz a un estudiante. Incluye fecha límite y estado de completado. */
export interface QuizAssignment {
  id: string;
  quizId: string;
  studentId: string;
  assignedBy?: string;
  dueDate?: Date;
  isCompleted: boolean;
  assignedAt: Date;
  completedAt?: Date;
  quiz?: Quiz;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  bestScore?: number;
}

/** Vista resumida de un quiz para el estudiante: datos del quiz + estado de asignación y mejor puntuación. */
export interface StudentQuiz {
  id: string;
  quizId: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  timeLimit: number;
  passingScore: number;
  questionsCount: number;
  assignedAt?: Date;
  dueDate?: Date;
  isCompleted: boolean;
  bestScore?: number;
  lastAttemptDate?: Date;
  attemptCount: number;
}

/**
 * Interfaz para solicitudes de recursos relacionadas con quizzes
 * Los estudiantes pueden solicitar recursos cuando realizan un cuestionario
 */
export interface QuizResourceRequest {
  id: string;
  quizId: string;
  studentId: string;
  questionId?: string;
  requestType: 'explanation' | 'material' | 'clarification' | 'technical' | 'other';
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  response?: string;
  respondedBy?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Datos relacionados para mostrar
  student?: {
    id: string;
    name: string;
    email: string;
  };
  quiz?: {
    id: string;
    title: string;
  };
  question?: {
    id: string;
    text: string;
  };
}
