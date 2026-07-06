/** Curso del catálogo. Define título, categoría (educación/matemáticas), precio y visibilidad. */
export interface Course {
  id: string;

  /* Información general del curso */
  title: string;
  description: string;

  /* Categoría */
  category: 'education' | 'mathematics';

  /* Multimedia */
  imageUrl?: string;
  videoUrl?: string;

  /* Precio */
  price: number;
  hidePrice?: boolean;

  /* Duración */
  duration?: number;
  durationMonths?: number;

  /* Visibilidad */
  isVisible: boolean;
    /* Control visual local — no se guarda en BD */
  expandida?: boolean;
}

/**
 * Representa una clase (grupo/instancia) de un curso.
 * Una clase tiene un profesor, fechas, cupo y estudiantes inscritos.
 */
export interface Class {
  id: string;

  /* Relación con curso */
  courseId: string;

  /* Datos principales */
  name: string;
  teacherId: string;

  /* Estado de la clase */
  status: 'open' | 'closed';

  /* Organización */
  classNumber: number;
  maxStudents: number;
  enrollmentCount: number;

  /* Fechas */
  startDate: Date;
  endDate: Date;

  /* Recursos (vídeos, enlaces, archivos) */
  imageUrl?: string;
  videoUrl?: string;
  resourceLink?: string;
  resourceFileUrl?: string;

  /* Observación del docente / administrador */
  observation?: string;

  /* Estudiantes inscritos */
  enrolledStudents?: string[];
}

export interface CourseEnrollment {
  id: string;

  /* Relación con curso y clase */
  courseId: string;
  classId: string;

  /* Estudiante */
  studentId: string;
  studentName?: string;
  studentEmail?: string;

  /* Estado */
  status?: 'active' | 'inactive' | 'pending';

  /* Fechas */
  enrollmentDate?: Date;
  enrolledAt?: Date;
}

/**
 * Nueva estructura para inscripción específica por clase.
 * La usaremos para gestionar estudiantes por clase.
 */
export interface ClassEnrollment {
  id: string;

  /* Relación principal */
  courseId: string;
  classId: string;
  studentId: string;

  /* Datos opcionales para mostrar en UI */
  studentName?: string;
  studentEmail?: string;

  /* Estado de la inscripción */
  status: 'active' | 'inactive' | 'pending';

  /* Fecha */
  enrollmentDate: Date;

  
}