import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { SupabaseService } from '../../services/supabase.service';
import { StudentQuiz } from '../../models/quiz.model';

@Component({
  selector: 'app-student-quizzes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="student-quizzes">
      <!-- Header -->
      <header class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="fas fa-clipboard-list"></i>
              Mis Cuestionarios
            </h1>
            <p>Aquí encontrarás todos los cuestionarios asignados por tus profesores</p>
          </div>
        </div>
      </header>

      <!-- Stats -->
      <section class="stats-section">
        <div class="stat-card">
          <div class="stat-icon pending">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ pendingQuizzes.length }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon in-progress">
            <i class="fas fa-spinner"></i>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ inProgressQuizzes.length }}</span>
            <span class="stat-label">En proceso</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon completed">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ completedQuizzes.length }}</span>
            <span class="stat-label">Completados</span>
          </div>
        </div>
      </section>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-container">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando tus cuestionarios...</p>
      </div>

      <!-- Error -->
      <div *ngIf="errorMessage" class="alert alert-error">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <!-- Quiz List -->
      <section *ngIf="!loading" class="quiz-section">
        <!-- Pending Quizzes -->
        <div *ngIf="pendingQuizzes.length > 0" class="quiz-category">
          <h2>
            <i class="fas fa-clock"></i> Cuestionarios Pendientes
          </h2>
          <div class="quiz-grid">
            <div *ngFor="let quiz of pendingQuizzes" class="quiz-card pending-card">
              <div class="card-header">
                <span class="badge" [ngClass]="'difficulty-' + quiz.difficulty">
                  {{ quiz.difficulty | titlecase }}
                </span>
                <span class="category">{{ quiz.category | titlecase }}</span>
              </div>
              <div class="card-body">
                <h3>{{ quiz.title }}</h3>
                <p>{{ quiz.description }}</p>
                <div class="quiz-info">
                  <div class="info-item">
                    <i class="fas fa-question-circle"></i>
                    <span>{{ quiz.questionsCount }} preguntas</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>{{ quiz.timeLimit }} min</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-percentage"></i>
                    <span>{{ quiz.passingScore }}% para aprobar</span>
                  </div>
                </div>
                <div *ngIf="quiz.dueDate" class="due-date" [class.overdue]="isOverdue(quiz.dueDate)">
                  <i class="fas fa-calendar"></i>
                  Fecha límite: {{ formatDate(quiz.dueDate) }}
                </div>
              </div>
              <div class="card-footer">
                <a [routerLink]="['/quiz', quiz.quizId]" class="btn btn-start">
                  <i class="fas fa-play"></i> Comenzar
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- In Progress Quizzes -->
        <div *ngIf="inProgressQuizzes.length > 0" class="quiz-category">
          <h2>
            <i class="fas fa-spinner"></i> Cuestionarios En Progreso
          </h2>
          <div class="quiz-grid">
            <div *ngFor="let quiz of inProgressQuizzes" class="quiz-card progress-card">
              <div class="card-header">
                <span class="badge" [ngClass]="'difficulty-' + quiz.difficulty">
                  {{ quiz.difficulty | titlecase }}
                </span>
                <span class="category">{{ quiz.category | titlecase }}</span>
              </div>
              <div class="card-body">
                <h3>{{ quiz.title }}</h3>
                <p>{{ quiz.description }}</p>
                <div class="quiz-info">
                  <div class="info-item">
                    <i class="fas fa-question-circle"></i>
                    <span>{{ quiz.questionsCount }} preguntas</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>{{ quiz.timeLimit }} min</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-star"></i>
                    <span>Mejor nota: {{ quiz.bestScore }}%</span>
                  </div>
                </div>
                <div *ngIf="quiz.attemptCount > 0" class="attempts-info">
                  <i class="fas fa-redo"></i> {{ quiz.attemptCount }} intento(s) realizado(s)
                </div>
              </div>
              <div class="card-footer">
                <a [routerLink]="['/quiz', quiz.quizId]" class="btn btn-start">
                  <i class="fas fa-redo"></i> Continuar
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Quizzes -->
        <div *ngIf="completedQuizzes.length > 0" class="quiz-category">
          <h2>
            <i class="fas fa-check-circle"></i> Cuestionarios Completados
          </h2>
          <div class="quiz-grid">
            <div *ngFor="let quiz of completedQuizzes" class="quiz-card completed-card">
              <div class="card-header">
                <span class="badge" [ngClass]="quiz.bestScore !== undefined && quiz.bestScore >= quiz.passingScore ? 'passed' : 'failed'">
                  {{ quiz.bestScore !== undefined && quiz.bestScore >= quiz.passingScore ? 'Aprobado' : 'Reprobado' }}
                </span>
                <span class="category">{{ quiz.category | titlecase }}</span>
              </div>
              <div class="card-body">
                <h3>{{ quiz.title }}</h3>
                <p>{{ quiz.description }}</p>
                <div class="score-display">
                  <div class="score-circle" [ngClass]="{'passed': quiz.bestScore !== undefined && quiz.bestScore >= quiz.passingScore}">
                    <span class="score-value">{{ quiz.bestScore }}%</span>
                  </div>
                  <span class="score-label">
                    {{ quiz.bestScore !== undefined && quiz.bestScore >= quiz.passingScore ? '¡Felicidades!' : 'Intenta de nuevo' }}
                  </span>
                </div>
                <div *ngIf="quiz.lastAttemptDate" class="completed-date">
                  <i class="fas fa-calendar-check"></i>
                  Completado: {{ formatDate(quiz.lastAttemptDate) }}
                </div>
              </div>
              <div class="card-footer">
                <a [routerLink]="['/quiz', quiz.quizId]" class="btn btn-outline">
                  <i class="fas fa-eye"></i> Ver resultado
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="quizzes.length === 0" class="empty-state">
          <i class="fas fa-clipboard"></i>
          <h3>No tienes cuestionarios asignados</h3>
          <p>Cuando tu profesor te asigne cuestionarios, aparecerán aquí</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .student-quizzes {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
      color: white;
    }

    .page-header h1 {
      margin: 0 0 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-header p {
      margin: 0;
      opacity: 0.9;
    }

    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .stat-icon.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .stat-icon.in-progress {
      background: #e0e7ff;
      color: #4338ca;
    }

    .stat-icon.completed {
      background: #d1fae5;
      color: #065f46;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .loading-container {
      text-align: center;
      padding: 4rem;
      color: #10b981;
    }

    .loading-container i {
      font-size: 3rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .alert {
      padding: 1rem 1.5rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
    }

    .alert-error {
      background: #fee2e2;
      color: #991b1b;
    }

    .quiz-category {
      margin-bottom: 2.5rem;
    }

    .quiz-category h2 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #1f2937;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }

    .quiz-category h2 i {
      color: #10b981;
    }

    .quiz-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .quiz-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      transition: transform 0.3s ease;
    }

    .quiz-card:hover {
      transform: translateY(-5px);
    }

    .card-header {
      padding: 1rem 1.5rem;
      background: #f9fafb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .difficulty-easy { background: #d1fae5; color: #065f46; }
    .difficulty-medium { background: #fef3c7; color: #92400e; }
    .difficulty-hard { background: #fee2e2; color: #991b1b; }
    .passed { background: #d1fae5; color: #065f46; }
    .failed { background: #fee2e2; color: #991b1b; }

    .category {
      font-size: 0.85rem;
      color: #6b7280;
    }

    .card-body {
      padding: 1.5rem;
    }

    .card-body h3 {
      margin: 0 0 0.75rem;
      color: #1f2937;
    }

    .card-body p {
      color: #6b7280;
      margin-bottom: 1rem;
      font-size: 0.95rem;
    }

    .quiz-info {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .info-item i {
      color: #10b981;
    }

    .due-date {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #92400e;
      font-size: 0.9rem;
      padding: 0.5rem;
      background: #fef3c7;
      border-radius: 8px;
    }

    .due-date.overdue {
      background: #fee2e2;
      color: #991b1b;
    }

    .attempts-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #4338ca;
      font-size: 0.9rem;
    }

    .score-display {
      text-align: center;
      margin: 1rem 0;
    }

    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: #fee2e2;
      border: 4px solid #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.75rem;
    }

    .score-circle.passed {
      background: #d1fae5;
      border-color: #10b981;
    }

    .score-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
    }

    .score-label {
      font-size: 0.95rem;
      color: #6b7280;
    }

    .completed-date {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #065f46;
      font-size: 0.9rem;
    }

    .card-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      width: 100%;
    }

    .btn-start {
      background: #10b981;
      color: white;
    }

    .btn-start:hover {
      background: #059669;
    }

    .btn-outline {
      background: transparent;
      border: 2px solid #10b981;
      color: #10b981;
    }

    .btn-outline:hover {
      background: #10b981;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    }

    .empty-state i {
      font-size: 4rem;
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .student-quizzes {
        padding: 1rem;
      }

      .quiz-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StudentQuizzesComponent implements OnInit {
  quizzes: StudentQuiz[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private quizService: QuizService,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    await this.loadQuizzes();
  }

  async loadQuizzes() {
    try {
      this.loading = true;
      this.errorMessage = '';

      const { data: { user } } = await this.supabaseService.getClient().auth.getUser();

      if (!user) {
        this.errorMessage = 'No hay sesión activa';
        this.loading = false;
        return;
      }

      this.quizService.getStudentQuizzes(user.id).subscribe({
        next: (quizzes) => {
          this.quizzes = quizzes;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = 'Error al cargar los cuestionarios';
          this.loading = false;
        }
      });
    } catch (error) {
      this.errorMessage = 'Error al cargar los cuestionarios';
      this.loading = false;
    }
  }

  get pendingQuizzes(): StudentQuiz[] {
    return this.quizzes.filter(q => !q.isCompleted && q.attemptCount === 0);
  }

  get inProgressQuizzes(): StudentQuiz[] {
    return this.quizzes.filter(q => !q.isCompleted && q.attemptCount > 0);
  }

  get completedQuizzes(): StudentQuiz[] {
    return this.quizzes.filter(q => q.isCompleted);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  isOverdue(date: Date | string | undefined): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }
}
