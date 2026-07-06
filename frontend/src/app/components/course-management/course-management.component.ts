import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CourseService } from '../../services/course.service';
import { Course, Class, ClassEnrollment } from '../../models/course.model';
import { UserService } from '../../services/user.service';
import { User, UserRole } from '../../models/user.model';

type CourseForm = {
  title: string;
  description: string;
  category: 'education' | 'mathematics';
  isVisible: boolean;
  videoUrl: string;
  imageUrl?: string;
  price: number;
  hidePrice: boolean;
  duration?: number;
  durationMonths: number;
};

type ClassForm = {
  id?: string;
  name: string;
  teacherId: string;
  status: 'open' | 'closed';
  classNumber: number;
  maxStudents: number;
  enrollmentCount: number;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  resourceLink?: string;
  resourceFileUrl?: string;
  observation?: string;
  enrolledStudents: string[];
};

@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.css']
})
export class CourseManagementComponent implements OnInit {
  courses: Course[] = [];
  classes: Class[] = [];
  teachers: User[] = [];

  isLoading = false;
  errorMessage = '';

  editingCourse = false;
  editingClass = false;

  showClassModal = false;

  selectedCourse: Course | null = null;
  selectedClass: Class | null = null;

  showEnrollmentModal = false;
  selectedEnrollmentClass: Class | null = null;

  students: User[] = [];
  classEnrollments: ClassEnrollment[] = [];

  // --- Text-to-Speech ---
  ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  leyendo = false;
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

  newCourse: CourseForm = this.getEmptyCourseForm();
  newClass: ClassForm = this.getEmptyClassForm();

  selectedCourseImageFile: File | null = null;
  selectedClassImageFile: File | null = null;
  selectedClassResourceFile: File | null = null;

  constructor(
    private courseService: CourseService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    try {
      this.isLoading = true;
      await Promise.all([
        this.loadCourses(),
        this.loadTeachers()
      ]);
    } catch (error) {
      this.handleError('Error al cargar los datos iniciales', error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleError(message: string, error: unknown): void {
    console.error(message, error);

    const detailedMessage =
      error instanceof Error && error.message
        ? `${message}: ${error.message}`
        : message;

    this.errorMessage = detailedMessage;

    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private getEmptyCourseForm(): CourseForm {
    return {
      title: '',
      description: '',
      category: 'education',
      isVisible: true,
      videoUrl: '',
      imageUrl: '',
      price: 0,
      hidePrice: false,
      duration: 1,
      durationMonths: 1
    };
  }

  private getEmptyClassForm(): ClassForm {
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);

    return {
      name: '',
      teacherId: '',
      status: 'open',
      classNumber: 1,
      maxStudents: 20,
      enrollmentCount: 0,
      startDate: this.formatDateForInput(now),
      endDate: this.formatDateForInput(later),
      imageUrl: '',
      resourceLink: '',
      resourceFileUrl: '',
      observation: '',
      enrolledStudents: []
    };
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onCourseImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedCourseImageFile = input.files?.[0] ?? null;
  }

  onClassImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedClassImageFile = input.files?.[0] ?? null;
  }

  onClassFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedClassResourceFile = input.files?.[0] ?? null;
  }

  async loadCourses(): Promise<void> {
    try {
      this.courses = await this.courseService.getCourses();
    } catch (error) {
      this.handleError('Error al cargar los cursos', error);
    }
  }

  async loadTeachers(): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getUsers().subscribe({
        next: (users) => {
          this.teachers = users.filter((user) => user.role === UserRole.TEACHER);
          this.students = users.filter((user) => user.role === UserRole.STUDENT);
          resolve();
        },
        error: (error) => {
          this.handleError('Error al cargar los profesores', error);
          resolve();
        }
      });
    });
  }

  async saveCourse(): Promise<void> {
    try {
      this.isLoading = true;

      const payload: Partial<Course> = {
        title: this.newCourse.title.trim(),
        description: this.newCourse.description.trim(),
        category: this.newCourse.category,
        isVisible: this.newCourse.isVisible,
        videoUrl: this.newCourse.videoUrl.trim(),
        imageUrl: this.newCourse.imageUrl?.trim() || '',
        price: Number(this.newCourse.price),
        hidePrice: this.newCourse.hidePrice,
        duration: Number(this.newCourse.duration ?? 1),
        durationMonths: Number(this.newCourse.durationMonths)
      };

      if (this.editingCourse && this.selectedCourse) {
        await this.courseService.updateCourse(this.selectedCourse.id, payload as Course);
      } else {
        await this.courseService.createCourse(payload as Course);
      }

      this.resetCourseForm();
      await this.loadCourses();
    } catch (error) {
      this.handleError('Error al guardar el curso', error);
    } finally {
      this.isLoading = false;
    }
  }

  editCourse(course: Course): void {
    this.editingCourse = true;
    this.selectedCourse = course;

    this.newCourse = {
      title: course.title ?? '',
      description: course.description ?? '',
      category: course.category ?? 'education',
      isVisible: course.isVisible ?? true,
      videoUrl: course.videoUrl ?? '',
      imageUrl: course.imageUrl ?? '',
      price: course.price ?? 0,
      hidePrice: course.hidePrice ?? false,
      duration: course.duration ?? 1,
      durationMonths: course.durationMonths ?? 1
    };
  }

  async deleteCourse(id: string): Promise<void> {
    const confirmed = confirm('¿Estás seguro de que deseas eliminar este curso?');
    if (!confirmed) return;

    try {
      this.isLoading = true;
      await this.courseService.deleteCourse(id);
      await this.loadCourses();
    } catch (error) {
      this.handleError('Error al eliminar el curso', error);
    } finally {
      this.isLoading = false;
    }
  }

  async manageClasses(course: Course): Promise<void> {
    this.selectedCourse = course;
    this.showClassModal = true;
    this.resetClassForm();
    await this.loadClasses(course.id);
  }

  async loadClasses(courseId: string): Promise<void> {
    try {
      this.isLoading = true;
      this.classes = await this.courseService.getClasses(courseId);
    } catch (error) {
      this.handleError('Error al cargar las clases', error);
    } finally {
      this.isLoading = false;
    }
  }

  async saveClass(): Promise<void> {
    if (!this.selectedCourse) {
      this.handleError('No hay curso seleccionado para crear la clase', null);
      return;
    }

    try {
      this.isLoading = true;

      // Subir imagen y PDF si el usuario seleccionó archivos (antes no se guardaban)
      let imageUrl = this.newClass.imageUrl?.trim() || '';
      let resourceFileUrl = this.newClass.resourceFileUrl?.trim() || '';
      if (this.selectedClassImageFile || this.selectedClassResourceFile) {
        try {
          const uploaded = await this.courseService.uploadClassFiles(
            this.selectedClassImageFile,
            this.selectedClassResourceFile
          );
          if (uploaded.imageUrl) imageUrl = uploaded.imageUrl;
          if (uploaded.resourceFileUrl) resourceFileUrl = uploaded.resourceFileUrl;
        } catch (e) {
          this.handleError('Error al subir archivos. ¿Existe el bucket "class-resources" en Supabase?', e);
          this.isLoading = false;
          return;
        }
      }

      const payload: Partial<Class> = {
        name: this.newClass.name.trim(),
        teacherId: this.newClass.teacherId,
        status: this.newClass.status,
        classNumber: Number(this.newClass.classNumber),
        maxStudents: Number(this.newClass.maxStudents),
        enrollmentCount: Number(this.newClass.enrollmentCount),
        startDate: new Date(this.newClass.startDate),
        endDate: new Date(this.newClass.endDate),
        imageUrl,
        resourceLink: this.newClass.resourceLink?.trim() || '',
        resourceFileUrl,
        observation: this.newClass.observation,
        enrolledStudents: this.newClass.enrolledStudents,
        courseId: this.selectedCourse.id
      };

      if (this.editingClass && this.selectedClass) {
        await this.courseService.updateClass(this.selectedClass.id, payload as Class);
      } else {
        await this.courseService.createClass(payload as Class);
      }

      this.resetClassForm();

      if (this.selectedCourse) {
        await this.loadClasses(this.selectedCourse.id);
      }
    } catch (error) {
      this.handleError('Error al guardar la clase', error);
    } finally {
      this.isLoading = false;
    }
  }

  editClass(classItem: Class): void {
    this.editingClass = true;
    this.selectedClass = classItem;

    this.newClass = {
      id: classItem.id,
      name: classItem.name ?? '',
      teacherId: classItem.teacherId ?? '',
      status: classItem.status ?? 'open',
      classNumber: classItem.classNumber ?? 1,
      maxStudents: classItem.maxStudents ?? 20,
      enrollmentCount: classItem.enrollmentCount ?? 0,
      startDate: this.formatDateForInput(new Date(classItem.startDate)),
      endDate: this.formatDateForInput(new Date(classItem.endDate)),
      imageUrl: classItem.imageUrl ?? '',
      resourceLink: classItem.resourceLink ?? '',
      resourceFileUrl: classItem.resourceFileUrl ?? '',
      observation: classItem.observation ?? '',
      enrolledStudents: classItem.enrolledStudents ?? []
    };
  }

  async deleteClass(id: string): Promise<void> {
    const confirmed = confirm('¿Estás seguro de que deseas eliminar esta clase?');
    if (!confirmed) return;

    try {
      this.isLoading = true;
      await this.courseService.deleteClass(id);

      if (this.selectedCourse) {
        await this.loadClasses(this.selectedCourse.id);
      }
    } catch (error) {
      this.handleError('Error al eliminar la clase', error);
    } finally {
      this.isLoading = false;
    }
  }
/*
  manageEnrollments(classItem: Class): void {
    console.log('Gestión de inscripciones pendiente para:', classItem);
    alert(`Próximo paso: gestionar inscripciones de la clase "${classItem.name}"`);
 
    }*/
async manageEnrollments(classItem: Class): Promise<void> {

  // guardamos la clase seleccionada
  this.selectedEnrollmentClass = classItem;

  // abrimos el modal de inscripciones
  this.showEnrollmentModal = true;

  // cargamos los estudiantes inscritos
  await this.loadClassEnrollments(classItem.id);

}
async loadClassEnrollments(classId: string): Promise<void> {
  try {
    this.isLoading = true;

    const enrollments = await this.courseService.getClassEnrollments(classId);

    this.classEnrollments = enrollments.map((enrollment) => {
      const student = this.students.find((s) => s.id === enrollment.studentId);

      return {
        ...enrollment,
        studentName: student?.name || enrollment.studentName,
        studentEmail: student?.email || enrollment.studentEmail
      };
    });
  } catch (error) {
    this.handleError('Error al cargar inscripciones', error);
  } finally {
    this.isLoading = false;
  }
}

isStudentEnrolled(studentId: string): boolean {
  return this.classEnrollments.some((e) => e.studentId === studentId);
}

async enrollStudent(student: User): Promise<void> {
  if (!this.selectedEnrollmentClass || !this.selectedCourse) {
    return;
  }

  if (this.isStudentEnrolled(student.id)) {
    this.handleError('El estudiante ya está inscrito en esta clase', null);
    return;
  }

  try {
    this.isLoading = true;

    await this.courseService.createClassEnrollment({
      courseId: this.selectedCourse.id,
      classId: this.selectedEnrollmentClass.id,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      status: 'active',
      enrollmentDate: new Date()
    });

    await this.loadClassEnrollments(this.selectedEnrollmentClass.id);
  } catch (error) {
    this.handleError('Error al inscribir estudiante', error);
  } finally {
    this.isLoading = false;
  }
}

async removeEnrollment(enrollment: ClassEnrollment): Promise<void> {
  const confirmed = confirm(`¿Quitar a ${enrollment.studentName || enrollment.studentId} de esta clase?`);

  if (!confirmed) {
    return;
  }

  try {
    this.isLoading = true;
    await this.courseService.deleteClassEnrollment(enrollment.id);

    if (this.selectedEnrollmentClass) {
      await this.loadClassEnrollments(this.selectedEnrollmentClass.id);
    }
  } catch (error) {
    this.handleError('Error al quitar estudiante', error);
  } finally {
    this.isLoading = false;
  }
}

async toggleEnrollmentStatus(enrollment: ClassEnrollment): Promise<void> {
  const nextStatus = enrollment.status === 'active' ? 'inactive' : 'active';

  try {
    this.isLoading = true;
    await this.courseService.updateClassEnrollmentStatus(enrollment.id, nextStatus);

    if (this.selectedEnrollmentClass) {
      await this.loadClassEnrollments(this.selectedEnrollmentClass.id);
    }
  } catch (error) {
    this.handleError('Error al cambiar estado de inscripción', error);
  } finally {
    this.isLoading = false;
  }
}

closeEnrollmentModal(): void {
  this.showEnrollmentModal = false;
  this.selectedEnrollmentClass = null;
  this.classEnrollments = [];
}
    

  closeClassModal(): void {
    this.showClassModal = false;
    this.selectedClass = null;
    this.resetClassForm();
  }

  resetCourseForm(): void {
    this.newCourse = this.getEmptyCourseForm();
    this.editingCourse = false;
    this.selectedCourse = null;
    this.selectedCourseImageFile = null;
    this.errorMessage = '';
  }

  resetClassForm(): void {
    this.newClass = this.getEmptyClassForm();
    this.editingClass = false;
    this.selectedClass = null;
    this.selectedClassImageFile = null;
    this.selectedClassResourceFile = null;
    this.errorMessage = '';
  }

  // --- LEER EN VOZ ALTA ---
  leerClase(clase: Class | null): void {
    if (!clase || !this.ttsSupported || !this.synth) return;
    if (this.leyendo) {
      this.synth.cancel();
      this.leyendo = false;
      return;
    }
    const partes: string[] = [];
    if (clase.name) partes.push(clase.name);
    if (clase.observation) partes.push(clase.observation);
    if (partes.length === 0) {
      partes.push('Esta clase no tiene contenido de texto para leer.');
    }
    const texto = partes.join('. ');
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => { this.leyendo = false; };
    utterance.onerror = () => { this.leyendo = false; };
    this.leyendo = true;
    this.synth.speak(utterance);
  }
}