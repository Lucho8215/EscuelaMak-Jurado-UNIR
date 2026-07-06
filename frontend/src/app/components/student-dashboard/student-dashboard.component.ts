import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LessonService } from '../../services/lesson.service';
import { SupabaseService } from '../../services/supabase.service';
import { QuizService } from '../../services/quiz.service';
import { StudentLesson } from '../../models/lesson.model';
import { StudentQuiz } from '../../models/quiz.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  loading = false;
  errorMessage = '';

  studentName = 'Alumno';
  lessons: StudentLesson[] = [];
  quizzes: StudentQuiz[] = [];

  constructor(
    private lessonService: LessonService,
    private supabaseService: SupabaseService,
    private quizService: QuizService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    try {
      this.loading = true;
      this.errorMessage = '';

      const {
        data: { user }
      } = await this.supabaseService.getClient().auth.getUser();

      if (!user) {
        this.errorMessage = 'No hay sesión activa';
        return;
      }

      const appUserId = await this.lessonService.getAppUserIdByAuthUserId(user.id);

      if (!appUserId) {
        this.errorMessage = 'No se encontró el alumno en app_users';
        return;
      }

      const lessons = await this.lessonService.getStudentLessonsByStudent(appUserId);
      this.lessons = lessons;

      const nameFromEmail = user.email?.split('@')[0] || 'Alumno';
      this.studentName = nameFromEmail;

      // Load quizzes
      this.quizService.getStudentQuizzes(user.id).subscribe({
        next: (quizzes) => {
          this.quizzes = quizzes;
        },
        error: () => {
          // Silently handle quiz loading error
        }
      });
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al cargar el dashboard del alumno';
    } finally {
      this.loading = false;
    }
  }

  get activeLessons(): StudentLesson[] {
    return this.lessons.filter((lesson) => lesson.isActive);
  }

  get completedLessons(): StudentLesson[] {
    return this.lessons.filter((lesson) => lesson.status === 'completed');
  }

  get inProgressLessons(): StudentLesson[] {
    return this.lessons.filter((lesson) => lesson.status === 'in_progress');
  }

  get assignedLessons(): StudentLesson[] {
    return this.lessons.filter((lesson) => lesson.status === 'assigned');
  }

  get inactiveLessons(): StudentLesson[] {
    return this.lessons.filter((lesson) => !lesson.isActive || lesson.status === 'inactive');
  }

  get overallProgress(): number {
    if (this.lessons.length === 0) {
      return 0;
    }

    const total = this.lessons.reduce((sum, lesson) => sum + lesson.progressPercent, 0);
    return Math.round(total / this.lessons.length);
  }

  get recentLessons(): StudentLesson[] {
    return [...this.lessons]
      .sort((a, b) => {
        const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
        const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }

  get pendingLessons(): StudentLesson[] {
    return [...this.lessons]
      .filter((lesson) => lesson.status !== 'completed' && lesson.isActive)
      .sort((a, b) => a.progressPercent - b.progressPercent)
      .slice(0, 5);
  }

  // Quiz methods
  get pendingQuizzes(): StudentQuiz[] {
    return this.quizzes.filter(q => !q.isCompleted && q.attemptCount === 0).slice(0, 3);
  }

  get inProgressQuizzes(): StudentQuiz[] {
    return this.quizzes.filter(q => !q.isCompleted && q.attemptCount > 0).slice(0, 3);
  }

  get completedQuizzes(): StudentQuiz[] {
    return this.quizzes.filter(q => q.isCompleted).slice(0, 3);
  }

  get hasQuizzes(): boolean {
    return this.quizzes.length > 0;
  }

  getChartWidth(value: number): number {
    const total = this.lessons.length;
    return total > 0 ? (value / total) * 100 : 0;
  }

  getProgressColor(value: number): string {
    if (value >= 100) return '#16a34a';
    if (value >= 50) return '#2563eb';
    if (value > 0) return '#f59e0b';
    return '#94a3b8';
  }

  getStatusLabel(status: string): string {
    if (status === 'assigned') return 'No iniciada';
    if (status === 'in_progress') return 'En progreso';
    if (status === 'completed') return 'Completada';
    return 'Inactiva';
  }

  getWelcomeMessage(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
