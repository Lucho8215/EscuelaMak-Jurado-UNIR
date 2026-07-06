/** Lección de un curso. Contiene título, contenido, vídeo, recursos y orden dentro del curso. */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  summary?: string;
  objective?: string;
  content?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  resourceLink?: string;
  resourceFileUrl?: string;
  estimatedMinutes: number;
  orderIndex: number;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Estados posibles del progreso de un estudiante en una lección */
export type StudentLessonStatus =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'inactive';

/** Progreso de un estudiante en una lección: estado, porcentaje completado y fechas. */
export interface StudentLesson {
  id: string;
  lessonId: string;
  classId: string;
  studentId: string;
  status: StudentLessonStatus;
  progressPercent: number;
  score?: number | null;
  isActive: boolean;
  assignedAt: Date;
  startedAt?: Date | null;
  lastAccessedAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  lessonTitle?: string;
  studentName?: string;
  studentEmail?: string;
  className?: string;
  summary?: string;
  objective?: string;
  content?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  resourceLink?: string;
  resourceFileUrl?: string;
}

/** Datos necesarios para crear una nueva lección */
export type CreateLessonInput = {
  courseId: string;
  classId?: string;
  title: string;
  summary?: string;
  objective?: string;
  content?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  resourceLink?: string;
  resourceFileUrl?: string;
  estimatedMinutes: number;
  orderIndex: number;
  isPublished: boolean;
};