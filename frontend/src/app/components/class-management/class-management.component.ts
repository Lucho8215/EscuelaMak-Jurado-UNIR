import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';
import { Class, Course, CourseEnrollment } from '../../models/course.model';
@Component({
  selector: 'app-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.css']
})
export class ClassManagementComponent implements OnInit {
  activeTab: string = 'clases';
  classes: Class[] = [];
  courses: Course[] = [];
  enrollments: CourseEnrollment[] = [];
  students: any[] = [];
  teachers: any[] = [];
  lessons: any[] = [];
  selectedClass: Class | null = null;
  loading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  newClass: Partial<Class> = this.getEmptyClass();
  editingClass: boolean = false;
  selectedStudentId: string = '';
  showEnrollForm: boolean = false;
  newLesson = { title: '', videoUrl: '' };
  selectedLessonForAssignment: any = null;
  lessonAssignments: string[] = [];
  selectedStudentsForEnroll: string[] = [];
  selectedStudentsForLesson: string[] = [];

  constructor(
    private courseService: CourseService,
    private authService: AuthService
  ) {}
  ngOnInit() {
    this.loadCourses();
    this.loadClasses();
    this.loadStudents();
    this.loadTeachers();
  }
  getEmptyClass(): Partial<Class> {
    return {
      name: '', courseId: '', teacherId: '',
      status: 'open', classNumber: 1,
      enrollmentCount: 0, maxStudents: 30,
      startDate: new Date(), endDate: new Date(),
      enrolledStudents: []
    };
  }
  async loadCourses() {
    try {
      this.courses = await this.courseService.getCourses();
    } catch(e: any) {
      this.errorMessage = 'Error cargando cursos: ' + e.message;
    }
  }
  async loadClasses() {
    this.loading = true;
    try {
      this.classes = await this.courseService.getClasses('');
      this.loading = false;
    } catch(e: any) {
      this.errorMessage = 'Error cargando clases: ' + e.message;
      this.loading = false;
    }
  }
  async loadStudents() {
    try {
      this.students = await this.courseService.getStudents();
    } catch(e: any) {
      console.error('Error cargando alumnos:', e.message);
    }
  }
  async loadTeachers() {
    try {
      this.teachers = await this.courseService.getUsersByRole(['teacher', 'tutor']);
    } catch(e: any) {
      console.error('Error cargando profesores:', e.message);
    }
  }
  async loadLessons(classId: string) {
    try {
      this.lessons = await this.courseService.getLessonsByClass(classId);
    } catch(e: any) {
      console.error('Error cargando lecciones:', e.message);
    }
  }
  async selectClass(clase: Class) {
    this.selectedClass = clase;
    this.showEnrollForm = false;
    this.selectedStudentId = '';
    this.selectedLessonForAssignment = null;
    await this.loadEnrollments(clase.id);
    await this.loadLessons(clase.id);
    window.scrollTo(0, 300);
  }
  async loadEnrollments(classId: string) {
    try {
      this.enrollments = await this.courseService.getEnrollments(classId);
    } catch(e) {
      this.enrollments = [];
    }
  }
  getCourseTitle(courseId: string): string {
    const course = this.courses.find(c => c.id === courseId);
    return course ? course.title : 'Sin curso';
  }
  async enrollStudent() {
    if (!this.selectedStudentId || !this.selectedClass) return;
    this.loading = true;
    try {
      await this.courseService.enrollStudentToClass(
        this.selectedStudentId,
        this.selectedClass.id,
        this.selectedClass.courseId
      );
      this.successMessage = 'Alumno inscrito correctamente';
      this.selectedStudentId = '';
      this.showEnrollForm = false;
      await this.loadEnrollments(this.selectedClass.id);
      await this.loadClasses();
      setTimeout(() => this.successMessage = '', 3000);
    } catch(e: any) {
      this.errorMessage = 'Error al inscribir: ' + e.message;
    }
    this.loading = false;
  }
  async removeEnrollment(enrollmentId: string) {
    if (!this.selectedClass) return;
    if (confirm('Eliminar esta inscripcion?')) {
      try {
        await this.courseService.removeEnrollment(enrollmentId, this.selectedClass.id);
        this.successMessage = 'Inscripcion eliminada';
        await this.loadEnrollments(this.selectedClass.id);
        await this.loadClasses();
        setTimeout(() => this.successMessage = '', 3000);
      } catch(e: any) {
        this.errorMessage = 'Error: ' + e.message;
      }
    }
  }
    async createLesson() {
    if (!this.selectedClass || !this.newLesson.title.trim()) return;
    this.loading = true;
    try {
      const lesson = await this.courseService.createLesson({
        class_id: this.selectedClass.id,
        title: this.newLesson.title,
        video_url: this.newLesson.videoUrl,
        order: this.lessons.length + 1
      });
      // Asignar a los alumnos seleccionados
      for (const studentId of this.selectedStudentsForLesson) {
        try {
          await this.courseService.toggleLessonAssignment(lesson.id, studentId);
        } catch(e) {}
      }
      this.successMessage = `Leccion creada y asignada a ${this.selectedStudentsForLesson.length} alumno(s)`;
      this.newLesson = { title: '', videoUrl: '' };
      this.selectedStudentsForLesson = [];
      await this.loadLessons(this.selectedClass.id);
      setTimeout(() => this.successMessage = '', 3000);
    } catch(e: any) {
      this.errorMessage = 'Error: ' + e.message;
    }
    this.loading = false;
  }

  async openAssignLesson(lesson: any) {
    this.selectedLessonForAssignment = lesson;
    try {
      const assignments = await this.courseService.getLessonAssignments(lesson.id);
      this.lessonAssignments = assignments.map((r: any) => r.student_id);
    } catch(e) {
      this.lessonAssignments = [];
    }
  }
  isStudentAssigned(studentId: string): boolean {
    return this.lessonAssignments.includes(studentId);
  }
  async toggleLessonAssignment(lessonId: string, studentId: string) {
    try {
      await this.courseService.toggleLessonAssignment(lessonId, studentId);
      if (this.lessonAssignments.includes(studentId)) {
        this.lessonAssignments = this.lessonAssignments.filter(id => id !== studentId);
      } else {
        this.lessonAssignments.push(studentId);
      }
    } catch(e: any) {
      this.errorMessage = 'Error: ' + e.message;
    }
  }
  async saveClass() {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    try {
      if (this.editingClass && this.newClass.id) {
        await this.courseService.updateClass(this.newClass.id, this.newClass as Class);
        this.successMessage = 'Clase actualizada correctamente';
      } else {
        await this.courseService.createClass(this.newClass as Class);
        this.successMessage = 'Clase creada correctamente';
      }
      this.loading = false;
      this.resetClassForm();
      await this.loadClasses();
      setTimeout(() => this.successMessage = '', 3000);
    } catch(e: any) {
      this.loading = false;
      this.errorMessage = 'Error: ' + e.message;
    }
  }
  editClass(clase: Class) {
    this.editingClass = true;
    this.newClass = { ...clase };
    window.scrollTo(0, 0);
  }
  async deleteClass(id: string) {
    if (confirm('Eliminar esta clase?')) {
      try {
        await this.courseService.deleteClass(id);
        this.successMessage = 'Clase eliminada';
        if (this.selectedClass?.id === id) this.selectedClass = null;
        await this.loadClasses();
        setTimeout(() => this.successMessage = '', 3000);
      } catch(e: any) {
        this.errorMessage = 'Error: ' + e.message;
      }
    }
  }
  resetClassForm() {
    this.editingClass = false;
    this.newClass = this.getEmptyClass();
  }
  setTab(tab: string) {
    this.activeTab = tab;
  }
  getStatusLabel(status: string): string {
    return status === 'open' ? 'Abierta' : 'Cerrada';
  }
  getStatusColor(status: string): string {
    return status === 'open' ? '#40c057' : '#ff6b6b';
  }
  getStudentName(studentId: string): string {
    const s = this.students.find(s => s.id === studentId);
    return s ? s.name : studentId;
  }
  getAvailableStudents(): any[] {
    const enrolledIds = this.enrollments.map(e => e.studentId);
    return this.students.filter(s => !enrolledIds.includes(s.id));
    
  }
    isSelectedForEnroll(studentId: string): boolean {
    return this.selectedStudentsForEnroll.includes(studentId);
  }

  toggleSelectForEnroll(studentId: string) {
    if (this.selectedStudentsForEnroll.includes(studentId)) {
      this.selectedStudentsForEnroll = this.selectedStudentsForEnroll.filter(id => id !== studentId);
    } else {
      this.selectedStudentsForEnroll.push(studentId);
    }
  }

  async enrollSelectedStudents() {
    if (!this.selectedClass || this.selectedStudentsForEnroll.length === 0) return;
    this.loading = true;
    let ok = 0;
    for (const studentId of this.selectedStudentsForEnroll) {
      try {
        await this.courseService.enrollStudentToClass(
          studentId, this.selectedClass.id, this.selectedClass.courseId
        );
        ok++;
      } catch(e) {}
    }
    this.successMessage = `${ok} alumno(s) inscritos correctamente`;
    this.selectedStudentsForEnroll = [];
    this.showEnrollForm = false;
    await this.loadEnrollments(this.selectedClass.id);
    await this.loadClasses();
    this.loading = false;
    setTimeout(() => this.successMessage = '', 3000);
  }

  isSelectedForLesson(studentId: string): boolean {
    return this.selectedStudentsForLesson.includes(studentId);
  }

  toggleSelectForLesson(studentId: string) {
    if (this.selectedStudentsForLesson.includes(studentId)) {
      this.selectedStudentsForLesson = this.selectedStudentsForLesson.filter(id => id !== studentId);
    } else {
      this.selectedStudentsForLesson.push(studentId);
    }
  }

  selectAllForLesson() {
    this.selectedStudentsForLesson = this.enrollments.map(e => e.studentId);
  }

}
