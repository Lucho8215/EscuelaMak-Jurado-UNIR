import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';
import { Quiz, Question, QuizAttempt } from '../../models/quiz.model';

@Component({
  selector: 'app-quiz-taking',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="module-container">

      <!-- PANTALLA 1: Informacion del quiz antes de empezar -->
      <div *ngIf="!quizStarted && !quizCompleted" class="kid-card">
        <div class="kid-card-content">

          <div *ngIf="loading" style="text-align:center; padding:2rem;">
            <i class="fas fa-spinner fa-spin" style="font-size:3rem; color:white;"></i>
            <p style="color:white; margin-top:1rem;">Cargando cuestionario...</p>
          </div>

          <div *ngIf="!loading && quiz">
            <h1>
              <i class="fas fa-question-circle text-yellow"></i>
              {{quiz.title}}
              <i class="fas fa-question-circle text-yellow"></i>
            </h1>

            <p class="description">{{quiz.description}}</p>

            <div class="quiz-info-grid">
              <div class="info-item">
                <i class="fas fa-clock"></i>
                <span>{{quiz.timeLimit}} minutos</span>
              </div>
              <div class="info-item">
                <i class="fas fa-star"></i>
                <span>Aprobar con {{quiz.passingScore}}%</span>
              </div>
              <div class="info-item">
                <i class="fas fa-question"></i>
                <span>{{quiz.questions?.length || 0}} preguntas</span>
              </div>
              <div class="info-item">
                <i class="fas fa-signal"></i>
                <span>Dificultad: {{quiz.difficulty}}</span>
              </div>
            </div>

            <div *ngIf="!quiz.questions || quiz.questions.length === 0"
                 style="text-align:center; padding:1rem; color:#ffeb3b;">
              <i class="fas fa-exclamation-triangle"></i>
              Este cuestionario no tiene preguntas todavia
            </div>

            <div class="button-group" style="justify-content:center; margin-top:2rem;">
              <button class="btn btn-kid"
                (click)="startQuiz()"
                [disabled]="!quiz.questions || quiz.questions.length === 0">
                <i class="fas fa-play"></i> Comenzar
              </button>
              <button class="btn btn-kid btn-secondary" routerLink="/dashboard">
                <i class="fas fa-arrow-left"></i> Volver
              </button>
            </div>
          </div>

          <div *ngIf="!loading && !quiz" style="text-align:center; padding:2rem;">
            <i class="fas fa-times-circle" style="font-size:3rem; color:#ff6b6b;"></i>
            <p style="color:white; margin-top:1rem;">Cuestionario no encontrado</p>
            <button class="btn btn-kid" routerLink="/dashboard">Volver al Panel</button>
          </div>

        </div>
      </div>

      <!-- PANTALLA 2: Respondiendo el quiz -->
      <div *ngIf="quizStarted && !quizCompleted" class="kid-card">
        <div class="kid-card-content">

          <!-- Cabecera con timer y progreso -->
          <div class="quiz-header">
            <div class="timer" [class.warning]="timeLeft <= 60">
              <i class="fas fa-clock"></i>
              <span>{{formatTime(timeLeft)}}</span>
            </div>
            <div class="progress-info">
              <span>Pregunta {{currentQuestionIndex + 1}} de {{quiz!.questions.length}}</span>
              <div class="progress-bar">
                <div class="progress-fill"
                  [style.width.%]="((currentQuestionIndex + 1) / quiz!.questions.length) * 100">
                </div>
              </div>
            </div>
          </div>

          <!-- Pregunta actual -->
          <div class="question-container">
            <h2>{{currentQuestion?.text}}</h2>

            <div class="options-list">
              <div *ngFor="let option of currentQuestion?.options; let i = index"
                   class="option-item"
                   [class.selected]="selectedOption === i"
                   (click)="selectOption(i)">
                <span class="option-letter">{{['A','B','C','D'][i]}}</span>
                <span class="option-text">{{option}}</span>
                <i *ngIf="selectedOption === i"
                   class="fas fa-check-circle"
                   style="color:#40c057; margin-left:auto;">
                </i>
              </div>
            </div>

            <!-- Botones de navegacion -->
            <div class="navigation-buttons">
              <button *ngIf="currentQuestionIndex > 0"
                class="btn btn-kid btn-secondary"
                (click)="previousQuestion()">
                <i class="fas fa-arrow-left"></i> Anterior
              </button>

              <button *ngIf="currentQuestionIndex < quiz!.questions.length - 1"
                class="btn btn-kid"
                [disabled]="selectedOption === null"
                (click)="nextQuestion()">
                Siguiente <i class="fas fa-arrow-right"></i>
              </button>

              <button *ngIf="currentQuestionIndex === quiz!.questions.length - 1"
                class="btn btn-kid"
                [disabled]="selectedOption === null"
                (click)="finishQuiz()">
                Terminar <i class="fas fa-check"></i>
              </button>

              <!-- Botón para solicitar ayuda -->
              <button class="btn btn-kid btn-secondary"
                      (click)="openResourceModal()"
                      style="margin-left: auto;">
                <i class="fas fa-question-circle"></i> Solicitar ayuda
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- PANTALLA 3: Resultados finales -->
      <div *ngIf="quizCompleted" class="kid-card results-card">
        <div class="kid-card-content">

          <h1>
            <i class="fas fa-trophy text-yellow"></i>
            Resultados
            <i class="fas fa-trophy text-yellow"></i>
          </h1>

          <!-- Circulo con puntaje -->
          <div class="score-circle" [class.passed]="score >= quiz!.passingScore">
            <div class="score-value">{{score}}%</div>
            <div class="score-label">
              {{score >= quiz!.passingScore ? 'Aprobado!' : 'Intenta de nuevo'}}
            </div>
          </div>

          <!-- Estadisticas -->
          <div class="stats">
            <div class="stat-item">
              <i class="fas fa-check-circle" style="color:#40c057;"></i>
              <span>Correctas: {{correctAnswers}}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-times-circle" style="color:#ff6b6b;"></i>
              <span>Incorrectas: {{quiz!.questions.length - correctAnswers}}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-clock" style="color:#ffeb3b;"></i>
              <span>Tiempo: {{formatTime(tiempoUsado)}}</span>
            </div>
          </div>

          <!-- Guardando resultado -->
          <div *ngIf="savingResult" style="text-align:center; color:white; margin:1rem 0;">
            <i class="fas fa-spinner fa-spin"></i> Guardando tu resultado...
          </div>
          <div *ngIf="resultSaved" style="text-align:center; color:#40c057; margin:1rem 0;">
            <i class="fas fa-check-circle"></i> Resultado guardado correctamente
          </div>

          <!-- Revision de respuestas -->
          <div class="answers-review">
            <h3>Revision de Respuestas</h3>
            <div *ngFor="let question of quiz!.questions; let i = index"
                 class="review-item"
                 [class.correct-answer]="userAnswers[i] === question.correctAnswer"
                 [class.wrong-answer]="userAnswers[i] !== question.correctAnswer">

              <div class="question-header">
                <span>Pregunta {{i + 1}}</span>
                <span>
                  <i class="fas"
                    [class.fa-check]="userAnswers[i] === question.correctAnswer"
                    [class.fa-times]="userAnswers[i] !== question.correctAnswer"
                    [style.color]="userAnswers[i] === question.correctAnswer ? '#40c057' : '#ff6b6b'">
                  </i>
                </span>
              </div>

              <p class="question-text">{{question.text}}</p>

              <div class="answer-details">
                <p>Tu respuesta:
                  <strong>{{question.options[userAnswers[i]] || 'Sin responder'}}</strong>
                </p>
                <p *ngIf="userAnswers[i] !== question.correctAnswer"
                   style="color:#40c057;">
                  Respuesta correcta:
                  <strong>{{question.options[question.correctAnswer]}}</strong>
                </p>
                <p *ngIf="question.explanation"
                   class="explanation">
                  <i class="fas fa-lightbulb"></i> {{question.explanation}}
                </p>
              </div>
            </div>
          </div>

          <!-- Botones finales -->
          <div class="button-group" style="justify-content:center; margin-top:2rem;">
            <button class="btn btn-kid" (click)="retryQuiz()">
              <i class="fas fa-redo"></i> Intentar de nuevo
            </button>
            <button class="btn btn-kid btn-secondary" routerLink="/dashboard">
              <i class="fas fa-home"></i> Ir al Panel
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- MODAL: Solicitar ayuda/recursos -->
    <div *ngIf="showResourceModal" class="resource-modal-overlay" (click)="closeResourceModal()">
      <div class="resource-modal" (click)="$event.stopPropagation()">
        <div class="resource-modal-header">
          <h3><i class="fas fa-question-circle"></i> Solicitar Ayuda</h3>
          <button class="btn-icon" (click)="closeResourceModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="resource-modal-body" *ngIf="!resourceRequestSent">
          <p>Pregunta actual: {{ currentQuestion?.text | slice:0:80 }}...</p>

          <div class="form-group">
            <label>Tipo de solicitud</label>
            <select [(ngModel)]="resourceType" class="form-input">
              <option value="explanation">Explicación adicional</option>
              <option value="material">Material de estudio</option>
              <option value="clarification">Aclaración de pregunta</option>
              <option value="technical">Problema técnico</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div class="form-group">
            <label>Describe tu solicitud</label>
            <textarea [(ngModel)]="resourceDescription" rows="4" 
                      class="form-input" 
                      placeholder="¿Qué necesitas? Ejemplo: No entiendo esta pregunta..."></textarea>
          </div>

          <p *ngIf="resourceRequestError" class="error-text">{{ resourceRequestError }}</p>
        </div>

        <div class="resource-modal-body" *ngIf="resourceRequestSent">
          <div class="success-message">
            <i class="fas fa-check-circle"></i>
            <p>¡Solicitud enviada! Tu profesor la revisará pronto.</p>
          </div>
        </div>

        <div class="resource-modal-footer" *ngIf="!resourceRequestSent">
          <button class="btn btn-kid btn-secondary" (click)="closeResourceModal()">
            Cancelar
          </button>
          <button class="btn btn-kid" (click)="submitResourceRequest()">
            <i class="fas fa-paper-plane"></i> Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quiz-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .info-item {
      background: rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: white;
      font-family: 'Comic Sans MS', cursive;
    }
    .quiz-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      background: rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 10px;
    }
    .timer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      color: white;
      font-family: 'Comic Sans MS', cursive;
      font-weight: bold;
    }
    .timer.warning {
      color: #ff6b6b;
      animation: pulse 1s infinite;
    }
    .progress-info {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      text-align: right;
    }
    .progress-bar {
      width: 200px;
      height: 10px;
      background: rgba(255,255,255,0.2);
      border-radius: 5px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #40c057;
      border-radius: 5px;
      transition: width 0.3s ease;
    }
    .question-container { text-align: center; }
    .question-container h2 {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      margin-bottom: 2rem;
      font-size: 1.5rem;
    }
    .options-list { display: grid; gap: 1rem; margin: 2rem 0; text-align: left; }
    .option-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .option-item:hover {
      transform: translateX(10px);
      background: rgba(255,255,255,0.2);
    }
    .option-item.selected {
      background: rgba(64,192,87,0.3);
      border: 2px solid #40c057;
      transform: translateX(10px);
    }
    .option-letter {
      background: white;
      color: #333;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: bold;
      font-family: 'Comic Sans MS', cursive;
      flex-shrink: 0;
    }
    .option-text {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      flex: 1;
    }
    .navigation-buttons {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }
    .score-circle {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: rgba(255,0,0,0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 2rem auto;
      border: 4px solid #ff6b6b;
    }
    .score-circle.passed {
      background: rgba(64,192,87,0.2);
      border-color: #40c057;
    }
    .score-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: white;
      font-family: 'Comic Sans MS', cursive;
    }
    .score-label {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      font-size: 1rem;
      text-align: center;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
      background: rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 10px;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: white;
      font-family: 'Comic Sans MS', cursive;
    }
    .answers-review { margin: 2rem 0; }
    .answers-review h3 {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      text-align: center;
      margin-bottom: 1rem;
    }
    .review-item {
      padding: 1rem;
      border-radius: 10px;
      margin-bottom: 1rem;
      border-left: 4px solid #ccc;
    }
    .correct-answer { border-left-color: #40c057; background: rgba(64,192,87,0.1); }
    .wrong-answer { border-left-color: #ff6b6b; background: rgba(255,107,107,0.1); }
    .question-header {
      display: flex;
      justify-content: space-between;
      color: white;
      font-family: 'Comic Sans MS', cursive;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .question-text {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      margin-bottom: 0.5rem;
    }
    .answer-details {
      background: rgba(255,255,255,0.05);
      padding: 0.75rem;
      border-radius: 8px;
    }
    .answer-details p {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      margin: 0.3rem 0;
    }
    .explanation {
      font-style: italic;
      opacity: 0.85;
      color: #ffeb3b !important;
    }
    .button-group { display: flex; gap: 1rem; flex-wrap: wrap; }
    .description { color: white; font-family: 'Comic Sans MS', cursive; margin-bottom: 1rem; }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    /* Estilos para modal de solicitud de recursos */
    .resource-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .resource-modal {
      background: white;
      border-radius: 15px;
      width: 100%;
      max-width: 450px;
      overflow: hidden;
    }
    .resource-modal-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .resource-modal-header h3 {
      margin: 0;
      font-family: 'Comic Sans MS', cursive;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .resource-modal-header .btn-icon {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1.2rem;
    }
    .resource-modal-body {
      padding: 1.5rem;
    }
    .resource-modal-body p {
      color: #6b7280;
      margin-bottom: 1rem;
      font-family: 'Comic Sans MS', cursive;
    }
    .resource-modal-body .form-group {
      margin-bottom: 1rem;
    }
    .resource-modal-body label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
      font-family: 'Comic Sans MS', cursive;
    }
    .resource-modal-body .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      font-family: 'Comic Sans MS', cursive;
    }
    .resource-modal-body .form-input:focus {
      outline: none;
      border-color: #667eea;
    }
    .error-text {
      color: #ef4444 !important;
      font-size: 0.9rem;
    }
    .success-message {
      text-align: center;
      padding: 2rem;
    }
    .success-message i {
      font-size: 3rem;
      color: #10b981;
    }
    .success-message p {
      color: #10b981 !important;
      font-size: 1.1rem;
      margin-top: 1rem;
    }
    .resource-modal-footer {
      padding: 1rem 1.5rem;
      background: #f9fafb;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .btn-secondary {
      background: #6b7280;
      color: white;
    }
  `]
})
export class QuizTakingComponent implements OnInit, OnDestroy {
  quiz: Quiz | null = null;
  quizStarted: boolean = false;
  quizCompleted: boolean = false;
  currentQuestionIndex: number = 0;
  selectedOption: number | null = null;
  userAnswers: number[] = [];
  timeLeft: number = 0;
  tiempoUsado: number = 0;
  timerInterval: any;
  score: number = 0;
  correctAnswers: number = 0;
  loading: boolean = true;
  savingResult: boolean = false;
  resultSaved: boolean = false;

  // Solicitar recursos
  showResourceModal: boolean = false;
  resourceType: string = 'explanation';
  resourceDescription: string = '';
  resourceRequestSent: boolean = false;
  resourceRequestError: string = '';

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get currentQuestion(): Question | undefined {
    return this.quiz?.questions[this.currentQuestionIndex];
  }

  ngOnInit() {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (quizId) {
      this.quizService.getQuiz(quizId).subscribe({
        next: (quiz) => {
          this.loading = false;
          if (quiz) {
            this.quiz = quiz;
            this.userAnswers = new Array(quiz.questions.length).fill(null);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        }
      });
    } else {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  startQuiz() {
    this.quizStarted = true;
    this.timeLeft = (this.quiz!.timeLimit || 10) * 60;
    this.startTimer();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.tiempoUsado++;
      } else {
        this.finishQuiz();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  selectOption(index: number) {
    this.selectedOption = index;
    this.userAnswers[this.currentQuestionIndex] = index;
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.selectedOption = this.userAnswers[this.currentQuestionIndex] ?? null;
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.quiz!.questions.length - 1) {
      this.currentQuestionIndex++;
      this.selectedOption = this.userAnswers[this.currentQuestionIndex] ?? null;
    }
  }

  finishQuiz() {
    this.stopTimer();
    this.calculateScore();
    this.quizCompleted = true;
    this.saveResult();
  }

  calculateScore() {
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    this.quiz!.questions.forEach((question, index) => {
      totalPoints += question.points;
      if (this.userAnswers[index] === question.correctAnswer) {
        correct++;
        earnedPoints += question.points;
      }
    });

    this.correctAnswers = correct;
    this.score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  }

  saveResult() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.quiz) return;

    this.savingResult = true;

    const attempt: Omit<QuizAttempt, 'id'> = {
      quizId: this.quiz.id,
      userId: currentUser.id,
      answers: this.userAnswers.map((answer, index) => ({
        questionId: this.quiz!.questions[index].id,
        selectedOption: answer
      })),
      score: this.score,
      passed: this.score >= (this.quiz.passingScore || 60),
      startedAt: new Date(Date.now() - this.tiempoUsado * 1000),
      completedAt: new Date(),
      timeSpentSeconds: this.tiempoUsado,
      status: this.score >= (this.quiz.passingScore || 60) ? 'completed' : 'completed'
    };

    this.quizService.saveAttempt(attempt).subscribe({
      next: () => {
        this.savingResult = false;
        this.resultSaved = true;
      },
      error: () => {
        this.savingResult = false;
      }
    });
  }

  retryQuiz() {
    this.quizStarted = false;
    this.quizCompleted = false;
    this.currentQuestionIndex = 0;
    this.selectedOption = null;
    this.userAnswers = new Array(this.quiz!.questions.length).fill(null);
    this.score = 0;
    this.correctAnswers = 0;
    this.tiempoUsado = 0;
    this.resultSaved = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA SOLICITAR RECURSOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre el modal para solicitar un recurso
   */
  openResourceModal() {
    this.showResourceModal = true;
    this.resourceType = 'explanation';
    this.resourceDescription = '';
    this.resourceRequestSent = false;
    this.resourceRequestError = '';
  }

  /**
   * Cierra el modal de solicitud de recurso
   */
  closeResourceModal() {
    this.showResourceModal = false;
  }

  /**
   * Envía la solicitud de recurso
   */
  submitResourceRequest() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.quiz) {
      this.resourceRequestError = 'No se pudo identificar al usuario';
      return;
    }

    if (!this.resourceDescription.trim()) {
      this.resourceRequestError = 'Por favor describe tu solicitud';
      return;
    }

    const questionId = this.quiz.questions[this.currentQuestionIndex]?.id;

    this.quizService.createResourceRequest({
      quizId: this.quiz.id,
      studentId: currentUser.id,
      questionId: questionId,
      requestType: this.resourceType as any,
      description: this.resourceDescription
    }).subscribe({
      next: () => {
        this.resourceRequestSent = true;
        setTimeout(() => {
          this.closeResourceModal();
        }, 2000);
      },
      error: (e) => {
        this.resourceRequestError = 'Error al enviar solicitud: ' + e.message;
      }
    });
  }

  /**
   * Obtiene el tipo de solicitud en texto legible
   */
  getResourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'explanation': 'Explicación adicional',
      'material': 'Material de estudio',
      'clarification': 'Aclaración de pregunta',
      'technical': 'Problema técnico',
      'other': 'Otro'
    };
    return labels[type] || type;
  }
}
