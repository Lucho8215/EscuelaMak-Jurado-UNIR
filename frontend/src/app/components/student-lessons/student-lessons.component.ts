import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonService } from '../../services/lesson.service';
import { SupabaseService } from '../../services/supabase.service';
import { StudentLesson } from '../../models/lesson.model';
@Component({
  selector: 'app-student-lessons',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-lessons.component.html',
  styleUrls: ['./student-lessons.component.css']
})
export class StudentLessonsComponent implements OnInit {
  lessons: StudentLesson[] = [];
  selectedLesson: StudentLesson | null = null;
  loading = false;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  // --- Text-to-Speech ---
  ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  leyendo = false;
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  constructor(
    private lessonService: LessonService,
    private supabaseService: SupabaseService,
    private sanitizer: DomSanitizer
  ) {}
  async ngOnInit(): Promise<void> {
    await this.loadMyLessons();
  }
  async loadMyLessons(): Promise<void> {
    try {
      this.loading = true;
      this.errorMessage = '';
      const { data: { user } } = await this.supabaseService.getClient().auth.getUser();
      if (!user) {
        this.errorMessage = 'No hay sesion activa';
        return;
      }
      const appUserId = await this.lessonService.getAppUserIdByAuthUserId(user.id);
      if (!appUserId) {
        this.errorMessage = 'No se encontro el alumno';
        return;
      }
      this.lessons = await this.lessonService.getStudentLessonsByStudent(appUserId);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Error al cargar lecciones';
    } finally {
      this.loading = false;
    }
  }
  openLesson(lesson: StudentLesson): void {
    this.selectedLesson = lesson;
    if (lesson.status === 'assigned') {
      this.startLesson(lesson);
    }
  }
  closeLesson(): void {
    this.selectedLesson = null;
    this.successMessage = '';
    // Detener lectura si esta activa
    if (this.leyendo && this.synth) {
      this.synth.cancel();
      this.leyendo = false;
    }
  }
  getVideoEmbedUrl(url: string): SafeResourceUrl {
    if (!url) return '';
    let videoId = '';
    if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    }
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${videoId}`
      );
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
  isVideoResource(url: string | undefined): boolean {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes('youtube.com') ||
           u.includes('youtu.be') ||
           u.includes('vimeo.com') ||
           u.match(/\.(mp4|webm|ogg)(\?|$)/i) !== null;
  }
  async startLesson(lesson: StudentLesson): Promise<void> {
    try {
      this.actionLoading = true;
      await this.lessonService.updateStudentLessonStatus(
        lesson.id, 'in_progress',
        lesson.progressPercent > 0 ? lesson.progressPercent : 10
      );
      await this.loadMyLessons();
      if (this.selectedLesson?.id === lesson.id) {
        this.selectedLesson = this.lessons.find(l => l.id === lesson.id) || null;
      }
    } catch (error) {
      this.errorMessage = 'No se pudo iniciar la leccion';
    } finally {
      this.actionLoading = false;
    }
  }
  async continueLesson(lesson: StudentLesson): Promise<void> {
    try {
      this.actionLoading = true;
      const next = Math.min(100, lesson.progressPercent + 20);
      await this.lessonService.updateStudentLessonProgress(lesson.id, next);
      await this.loadMyLessons();
      if (this.selectedLesson?.id === lesson.id) {
        this.selectedLesson = this.lessons.find(l => l.id === lesson.id) || null;
      }
      this.successMessage = `Progreso actualizado a ${next}%!`;
    } catch (error) {
      this.errorMessage = 'No se pudo actualizar el progreso';
    } finally {
      this.actionLoading = false;
    }
  }
  async completeLesson(lesson: StudentLesson): Promise<void> {
    try {
      this.actionLoading = true;
      await this.lessonService.updateStudentLessonStatus(lesson.id, 'completed');
      await this.loadMyLessons();
      if (this.selectedLesson?.id === lesson.id) {
        this.selectedLesson = this.lessons.find(l => l.id === lesson.id) || null;
      }
      this.successMessage = 'Leccion completada!';
    } catch (error) {
      this.errorMessage = 'No se pudo completar la leccion';
    } finally {
      this.actionLoading = false;
    }
  }
  getStatusLabel(status: string): string {
    const labels: any = {
      'assigned': 'Por iniciar',
      'in_progress': 'En progreso',
      'completed': 'Completada',
      'inactive': 'Inactiva'
    };
    return labels[status] || status;
  }
  getProgressColor(value: number): string {
    if (value >= 100) return '#16a34a';
    if (value >= 50) return '#2563eb';
    if (value > 0) return '#f59e0b';
    return '#94a3b8';
  }
  getOverallProgress(): number {
    if (this.lessons.length === 0) return 0;
    const total = this.lessons.reduce((sum, l) => sum + l.progressPercent, 0);
    return Math.round(total / this.lessons.length);
  }
  getCompletedCount(): number {
    return this.lessons.filter(l => l.status === 'completed').length;
  }
  getInProgressCount(): number {
    return this.lessons.filter(l => l.status === 'in_progress').length;
  }
  getPendingCount(): number {
    return this.lessons.filter(l => l.status === 'assigned').length;
  }
  // --- LEER EN VOZ ALTA ---
  leerLeccion(lesson: StudentLesson | null): void {
    if (!lesson || !this.ttsSupported || !this.synth) return;
    if (this.leyendo) {
      this.synth.cancel();
      this.leyendo = false;
      return;
    }
    const partes: string[] = [];
    if (lesson.lessonTitle) partes.push(lesson.lessonTitle);
    if (lesson.summary) partes.push(lesson.summary);
    if (lesson.objective) partes.push(lesson.objective);
    if (lesson.content) partes.push(lesson.content);
    if (partes.length === 0) {
      partes.push('Esta leccion no tiene contenido de texto para leer.');
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