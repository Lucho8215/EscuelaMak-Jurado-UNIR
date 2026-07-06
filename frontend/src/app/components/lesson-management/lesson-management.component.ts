import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { CourseService } from '../../services/course.service';
import { SupabaseService } from '../../services/supabase.service';
import { Lesson, StudentLesson } from '../../models/lesson.model';
import { Class } from '../../models/course.model';

type ResourceType = 'video' | 'pdf' | 'imagen' | 'contenido';

type LessonForm = {
  title: string;
  summary: string;
  objective: string;
  content: string;
  videoUrl: string;
  coverImageUrl: string;
  resourceLink: string;
  resourceFileUrl: string;
  estimatedMinutes: number;
  orderIndex: number;
  isPublished: boolean;
};

@Component({
  selector: 'app-lesson-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit {
  courseId = '';
  lessons: Lesson[] = [];
  classes: Class[] = [];
  classProgress: StudentLesson[] = [];

  selectedLesson: Lesson | null = null;
  selectedClassId = '';
  editing = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  scoreDrafts: Record<string, number> = {};

  // Vistas de recursos: "studentId_lessonId" → { video: bool, pdf: bool, ... }
  resourceViews: Record<string, Record<string, boolean>> = {};

  lessonForm: LessonForm = this.getEmptyForm();

  constructor(
    private route: ActivatedRoute,
    private lessonService: LessonService,
    private courseService: CourseService,
    private supabaseService: SupabaseService
  ) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  async ngOnInit(): Promise<void> {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';

    if (!this.courseId) {
      this.errorMessage = 'No se recibió el courseId';
      return;
    }

    await this.loadData();
  }

  private getEmptyForm(): LessonForm {
    return {
      title: '',
      summary: '',
      objective: '',
      content: '',
      videoUrl: '',
      coverImageUrl: '',
      resourceLink: '',
      resourceFileUrl: '',
      estimatedMinutes: 20,
      orderIndex: 1,
      isPublished: true
    };
  }

  private setSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 3500);
  }

  private setError(message: string, error?: unknown): void {
    console.error(message, error);
    this.errorMessage = error instanceof Error ? `${message}: ${error.message}` : message;
    this.successMessage = '';
  }

  async loadData(): Promise<void> {
    try {
      this.loading = true;

      const [lessons, classes] = await Promise.all([
        this.lessonService.getLessonsByCourse(this.courseId),
        this.courseService.getClasses(this.courseId)
      ]);

      this.lessons = lessons;
      this.classes = classes;
    } catch (error) {
      this.setError('Error al cargar las lecciones', error);
    } finally {
      this.loading = false;
    }
  }

  async saveLesson(): Promise<void> {
    try {
      this.loading = true;

      const payload = {
        courseId: this.courseId,
        classId: this.selectedClassId || undefined,
        title: this.lessonForm.title.trim(),
        summary: this.lessonForm.summary.trim(),
        objective: this.lessonForm.objective.trim(),
        content: this.lessonForm.content.trim(),
        videoUrl: this.lessonForm.videoUrl.trim(),
        coverImageUrl: this.lessonForm.coverImageUrl.trim(),
        resourceLink: this.lessonForm.resourceLink.trim(),
        resourceFileUrl: this.lessonForm.resourceFileUrl.trim(),
        estimatedMinutes: Number(this.lessonForm.estimatedMinutes),
        orderIndex: Number(this.lessonForm.orderIndex),
        isPublished: this.lessonForm.isPublished
      };

      if (this.editing && this.selectedLesson) {
        await this.lessonService.updateLesson(this.selectedLesson.id, payload);
        this.setSuccess('Lección actualizada correctamente');
      } else {
        await this.lessonService.createLesson(payload);
        this.setSuccess('Lección creada correctamente');
      }

      this.resetForm();
      await this.loadData();
    } catch (error) {
      this.setError('Error al guardar la lección', error);
    } finally {
      this.loading = false;
    }
  }

  editLesson(lesson: Lesson): void {
    this.selectedLesson = lesson;
    this.editing = true;

    this.lessonForm = {
      title: lesson.title,
      summary: lesson.summary || '',
      objective: lesson.objective || '',
      content: lesson.content || '',
      videoUrl: lesson.videoUrl || '',
      coverImageUrl: lesson.coverImageUrl || '',
      resourceLink: lesson.resourceLink || '',
      resourceFileUrl: lesson.resourceFileUrl || '',
      estimatedMinutes: lesson.estimatedMinutes || 20,
      orderIndex: lesson.orderIndex || 1,
      isPublished: lesson.isPublished
    };
  }

  async deleteLesson(lesson: Lesson): Promise<void> {
    const confirmed = confirm(`¿Eliminar la lección "${lesson.title}"?`);
    if (!confirmed) return;

    try {
      this.loading = true;
      await this.lessonService.deleteLesson(lesson.id);
      this.setSuccess('Lección eliminada');
      await this.loadData();
    } catch (error) {
      this.setError('Error al eliminar la lección', error);
    } finally {
      this.loading = false;
    }
  }

  resetForm(): void {
    this.lessonForm = this.getEmptyForm();
    this.selectedLesson = null;
    this.editing = false;
  }

  async assignLesson(lesson: Lesson): Promise<void> {
    if (!this.selectedClassId) {
      this.setError('Selecciona primero una clase');
      return;
    }

    try {
      this.loading = true;
      await this.lessonService.assignLessonToClass(
        lesson.id,
        this.courseId,
        this.selectedClassId
      );
      this.setSuccess('Lección asignada a la clase correctamente');
      await this.loadProgress();
    } catch (error) {
      this.setError('Error al asignar lección', error);
    } finally {
      this.loading = false;
    }
  }

  async loadProgress(): Promise<void> {
    if (!this.selectedClassId) {
      this.classProgress = [];
      return;
    }

    try {
      this.loading = true;
      this.classProgress = await this.lessonService.getStudentLessonsByClass(this.selectedClassId);

      this.scoreDrafts = {};
      for (const row of this.classProgress) {
        this.scoreDrafts[row.id] = Number(row.score ?? 0);
      }

      // Cargar vistas de recursos para todos los estudiantes de esta clase
      await this.loadResourceViews();
    } catch (error) {
      this.setError('Error al cargar progreso', error);
    } finally {
      this.loading = false;
    }
  }

  async loadResourceViews(): Promise<void> {
    if (this.classProgress.length === 0) return;
    const lessonIds = [...new Set(this.classProgress.map(r => r.lessonId))];
    const studentIds = [...new Set(this.classProgress.map(r => r.studentId))];
    try {
      const { data } = await this.supabase
        .from('lesson_resource_views')
        .select('student_id, lesson_id, resource_type')
        .in('lesson_id', lessonIds)
        .in('student_id', studentIds);

      const views: Record<string, Record<string, boolean>> = {};
      (data ?? []).forEach((r: any) => {
        const key = `${r.student_id}_${r.lesson_id}`;
        if (!views[key]) views[key] = {};
        views[key][r.resource_type] = true;
      });
      this.resourceViews = views;
    } catch { /* silencioso */ }
  }

  hasViewedResource(studentId: string, lessonId: string, type: ResourceType): boolean {
    return this.resourceViews[`${studentId}_${lessonId}`]?.[type] === true;
  }

  getResourceProgress(studentId: string, lessonId: string, lesson: Lesson): number {
    const views = this.resourceViews[`${studentId}_${lessonId}`] ?? {};
    let total = 1;
    let seen = views['contenido'] ? 1 : 0;
    if (lesson.videoUrl || lesson.resourceLink) { total++; if (views['video']) seen++; }
    if (lesson.resourceFileUrl) { total++; if (views['pdf']) seen++; }
    if (lesson.coverImageUrl) { total++; if (views['imagen']) seen++; }
    return Math.round((seen / total) * 100);
  }

  getLessonForRow(row: StudentLesson): Lesson | undefined {
    return this.lessons.find(l => l.id === row.lessonId);
  }

  async toggleActive(row: StudentLesson): Promise<void> {
    try {
      this.loading = true;
      await this.lessonService.toggleStudentLessonActive(row.id, !row.isActive);
      await this.loadProgress();
    } catch (error) {
      this.setError('Error al cambiar estado de la lección', error);
    } finally {
      this.loading = false;
    }
  }

  async markAssigned(row: StudentLesson): Promise<void> {
    try {
      this.loading = true;
      await this.lessonService.updateStudentLessonStatus(row.id, 'assigned', 0);
      await this.loadProgress();
    } catch (error) {
      this.setError('Error al reiniciar la lección', error);
    } finally {
      this.loading = false;
    }
  }

  async markInProgress(row: StudentLesson): Promise<void> {
    try {
      this.loading = true;
      const next = row.progressPercent > 0 ? row.progressPercent : 25;
      await this.lessonService.updateStudentLessonStatus(row.id, 'in_progress', next);
      await this.loadProgress();
    } catch (error) {
      this.setError('Error al iniciar la lección', error);
    } finally {
      this.loading = false;
    }
  }

  async markCompleted(row: StudentLesson): Promise<void> {
    try {
      this.loading = true;
      await this.lessonService.updateStudentLessonStatus(row.id, 'completed');
      await this.loadProgress();
    } catch (error) {
      this.setError('Error al completar la lección', error);
    } finally {
      this.loading = false;
    }
  }

  async changeProgress(row: StudentLesson, delta: number): Promise<void> {
    try {
      this.loading = true;
      const next = Math.max(0, Math.min(100, row.progressPercent + delta));
      await this.lessonService.updateStudentLessonProgress(row.id, next);
      await this.loadProgress();
    } catch (error) {
      this.setError('Error al actualizar porcentaje', error);
    } finally {
      this.loading = false;
    }
  }

  async saveScore(row: StudentLesson): Promise<void> {
    try {
      this.loading = true;
      const score = Number(this.scoreDrafts[row.id] ?? 0);
      await this.lessonService.updateStudentLessonScore(row.id, score);
      await this.loadProgress();
      this.setSuccess('Nota actualizada');
    } catch (error) {
      this.setError('Error al guardar la nota', error);
    } finally {
      this.loading = false;
    }
  }

  getProgressColor(value: number): string {
    if (value >= 100) return '#16a34a';
    if (value >= 50) return '#2563eb';
    if (value > 0) return '#f59e0b';
    return '#94a3b8';
  }

  getSummary() {
    const total = this.classProgress.length;
    const completed = this.classProgress.filter((x) => x.status === 'completed').length;
    const inProgress = this.classProgress.filter((x) => x.status === 'in_progress').length;
    const inactive = this.classProgress.filter((x) => !x.isActive || x.status === 'inactive').length;
    const assigned = this.classProgress.filter((x) => x.status === 'assigned').length;
    const average =
      total > 0
        ? Math.round(this.classProgress.reduce((sum, item) => sum + item.progressPercent, 0) / total)
        : 0;

    return { total, completed, inProgress, inactive, assigned, average };
  }

  getChartWidth(value: number): number {
    const summary = this.getSummary();
    return summary.total > 0 ? (value / summary.total) * 100 : 0;
  }
}