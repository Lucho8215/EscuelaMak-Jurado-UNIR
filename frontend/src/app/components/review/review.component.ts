import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { Quiz } from '../../models/quiz.model';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})
export class ReviewComponent implements OnInit, OnDestroy {

  private onOpenMensajes = () => this.abrirModalMensajes();

  // ─── DATOS ───────────────────────────────────────────
  // Lista de todos los quizzes disponibles
  quizzes: Quiz[] = [];

  // Intentos/logros de todos los estudiantes (para admin/profesor)
  todosLosLogros: any[] = [];

  // Logros filtrados por búsqueda
  logrosFiltrados: any[] = [];

  // Progreso de lecciones de todos los estudiantes
  progresoLecciones: any[] = [];

  // ─── MODAL ACTIVO ────────────────────────────────────
  // Puede ser: '' | 'quizzes' | 'logros' | 'quiz-detalle'
  modalActivo: string = '';

  // Quiz seleccionado para ver su detalle
  quizSeleccionado: Quiz | null = null;

  // ─── FILTROS ─────────────────────────────────────────
  // Texto para filtrar logros por nombre de estudiante
  filtroEstudiante: string = '';

  // Filtro por resultado: 'todos' | 'aprobado' | 'reprobado'
  filtroResultado: string = 'todos';

  // ─── ESTADOS ─────────────────────────────────────────
  cargando: boolean = false;
  cargandoLogros: boolean = false;

  // ─── ROL DEL USUARIO ─────────────────────────────────
  // true si es admin o profesor (ve todo)
  isAdminOrTeacher: boolean = false;

  // true si es estudiante (ve solo sus cosas)
  isStudent: boolean = false;

  // ID del usuario actual
  currentUserId: string = '';
  currentAuthId: string = '';  // auth.users.id para comparar sender_id

  // ─── MENSAJES ────────────────────────────────────────
  conversations: any[] = [];
  loadingConversations = false;
  activeConversation: any | null = null;
  activeMessages: any[] = [];
  loadingMessages = false;
  replyInput = '';
  sendingReply = false;
  // Para nuevo mensaje a estudiante
  allStudents: any[] = [];
  selectedStudentId = '';
  newMsgInput = '';
  sendingNew = false;
  showNewMsg = false;

  constructor(
    private quizService: QuizService,
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  private get supabase() { return this.supabaseService.getClient(); }

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.currentUserId = user.id;
    this.isAdminOrTeacher = user.role === UserRole.ADMIN || user.role === UserRole.TEACHER;
    this.isStudent = user.role === UserRole.STUDENT;

    // Obtener auth ID para comparar sender_id en mensajes
    const { data: { user: authUser } } = await this.supabase.auth.getUser();
    this.currentAuthId = authUser?.id ?? '';

    // Escuchar evento del sidebar para abrir modal mensajes estando ya en esta página
    window.addEventListener('escuelamak:open-mensajes', this.onOpenMensajes);

    // Cargamos los quizzes al inicio
    await this.loadQuizzes();

    await this.loadConversations();

    // Verificar si navegamos aquí desde otra página con señal en localStorage
    const pendingModal = localStorage.getItem('open_modal');
    if (pendingModal === 'mensajes') {
      localStorage.removeItem('open_modal');
      this.abrirModalMensajes();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('escuelamak:open-mensajes', this.onOpenMensajes);
  }

  // ─── CARGAR QUIZZES ──────────────────────────────────
  // Trae todos los quizzes habilitados de Supabase
  // Carga quizzes usando getVisibleQuizzes para evitar
  // el error 400 de quiz_assignments
  async loadQuizzes(): Promise<void> {
    this.cargando = true;
    this.quizService.getVisibleQuizzes().subscribe({
      next: (data) => {
        this.quizzes = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando quizzes:', err);
        this.cargando = false;
      }
    });
  
  }

  // ─── ABRIR MODAL QUIZZES ─────────────────────────────
  abrirModalQuizzes(): void {
    this.modalActivo = 'quizzes';
  }

  // ─── ABRIR DETALLE DE UN QUIZ ────────────────────────
  // Muestra las preguntas y opciones de un quiz específico
  verDetalleQuiz(quiz: Quiz): void {
    this.quizSeleccionado = quiz;
    this.modalActivo = 'quiz-detalle';
  }

  // ─── VOLVER AL LISTADO DE QUIZZES ───────────────────
  volverAQuizzes(): void {
    this.quizSeleccionado = null;
    this.modalActivo = 'quizzes';
  }

  // ─── ABRIR MODAL LOGROS / PROGRESO ──────────────────
  // Si es admin/profesor → ve logros de TODOS los estudiantes
  // Si es estudiante → ve solo sus propios logros
  async abrirModalLogros(): Promise<void> {
    this.modalActivo = 'logros';
    this.cargandoLogros = true;

    if (this.isAdminOrTeacher) {
      // Admin ve todos los intentos de todos los alumnos
      this.quizService.getAllAttempts().subscribe({
        next: (data) => {
          this.todosLosLogros = data;
          this.aplicarFiltros();
          this.cargandoLogros = false;
        },
        error: () => { this.cargandoLogros = false; }
      });
    } else {
      // Estudiante ve solo sus intentos
      this.quizService.getStudentQuizzes(this.currentUserId).subscribe({
       next: (data: any[]) => {
          this.todosLosLogros = data;
          this.aplicarFiltros();
          this.cargandoLogros = false;
        },
        error: () => { this.cargandoLogros = false; }
      });
    }
  }

  // ─── APLICAR FILTROS A LOS LOGROS ───────────────────
  // Filtra por nombre de estudiante y por resultado
  aplicarFiltros(): void {
    let resultado = [...this.todosLosLogros];

    // Filtrar por nombre si hay texto en la búsqueda
    if (this.filtroEstudiante.trim()) {
      const texto = this.filtroEstudiante.toLowerCase();
      resultado = resultado.filter(l =>
        (l.student_name || l.studentName || '').toLowerCase().includes(texto) ||
        (l.student_email || l.studentEmail || '').toLowerCase().includes(texto)
      );
    }

    // Filtrar por resultado aprobado/reprobado
    if (this.filtroResultado === 'aprobado') {
      resultado = resultado.filter(l => l.passed);
    } else if (this.filtroResultado === 'reprobado') {
      resultado = resultado.filter(l => !l.passed);
    }

    this.logrosFiltrados = resultado;
  }

  // ─── CERRAR CUALQUIER MODAL ──────────────────────────
  cerrarModal(): void {
    this.modalActivo = '';
    this.quizSeleccionado = null;
    this.filtroEstudiante = '';
    this.filtroResultado = 'todos';
  }

  // ─── HELPERS DE DISPLAY ─────────────────────────────
  // Convierte la dificultad en texto legible
  getDificultadLabel(dif: string): string {
    const labels: any = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' };
    return labels[dif] || dif;
  }

  // Color según dificultad
  getDificultadColor(dif: string): string {
    const colors: any = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };
    return colors[dif] || '#94a3b8';
  }

  // Color según puntaje
  getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  // Estadísticas rápidas para el panel de logros
  getTotalAprobados(): number {
    return this.logrosFiltrados.filter(l => l.passed).length;
  }

  getTotalReprobados(): number {
    return this.logrosFiltrados.filter(l => !l.passed).length;
  }

  getPromedioGeneral(): number {
    if (this.logrosFiltrados.length === 0) return 0;
    const suma = this.logrosFiltrados.reduce((acc, l) => acc + (l.score || 0), 0);
    return Math.round(suma / this.logrosFiltrados.length);
  }

  // Quizzes activos/inactivos para el resumen
  getQuizzesActivos(): number {
    return this.quizzes.filter(q => q.isEnabled).length;
  }

  // ─── MENSAJES ────────────────────────────────────────
  abrirModalMensajes(): void {
    this.modalActivo = 'mensajes';
    this.loadConversations();
  }

  getTotalUnread(): number {
    return this.conversations.reduce((sum, c) => sum + c.unread, 0);
  }

  // Busca o crea una conversación entre dos auth IDs (igual que la app móvil)
  private async getOrCreateConversation(myAuthId: string, otherAuthId: string): Promise<string | null> {
    try {
      const { data: existing } = await this.supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [myAuthId, otherAuthId])
        .maybeSingle();
      if (existing) return existing.id;

      const { data: newConv } = await this.supabase
        .from('conversations')
        .insert({ participant_ids: [myAuthId, otherAuthId] })
        .select('id')
        .single();
      return newConv?.id ?? null;
    } catch { return null; }
  }

  async loadConversations(): Promise<void> {
    this.loadingConversations = true;
    try {
      const myAuthId = this.currentAuthId;
      if (!myAuthId) return;

      // 1. Obtener todas las conversaciones donde participa el admin/teacher
      const { data: convs, error } = await this.supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at')
        .contains('participant_ids', [myAuthId])
        .order('last_message_at', { ascending: false });
      if (error || !convs) return;

      // 2. Para cada conversación buscar el otro participante (estudiante)
      const result: any[] = [];
      for (const conv of convs) {
        const ids = conv.participant_ids as string[];
        const otherAuthId = ids.find((id: string) => id !== myAuthId);
        if (!otherAuthId) continue;

        // Buscar info del otro usuario por auth_user_id
        const { data: otherUser } = await this.supabase
          .from('app_users')
          .select('id, name, role, auth_user_id')
          .eq('auth_user_id', otherAuthId)
          .maybeSingle();
        if (!otherUser) continue;

        // Último mensaje de la conversación
        const { data: msgs } = await this.supabase
          .from('messages')
          .select('id, sender_id, contenido, is_read, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Mensajes sin leer enviados por el otro
        const { count: unread } = await this.supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_id', otherAuthId)
          .eq('is_read', false);

        result.push({
          id: conv.id,
          student: { ...otherUser, auth_user_id: otherAuthId },
          lastMessage: msgs?.[0] ?? null,
          unread: unread ?? 0
        });
      }
      this.conversations = result;

      // Lista de estudiantes para nuevo mensaje
      const { data: students } = await this.supabase
        .from('app_users').select('id, name').eq('role', 'student').order('name');
      this.allStudents = students || [];
    } finally {
      this.loadingConversations = false;
    }
  }

  async openConversation(conv: any): Promise<void> {
    this.activeConversation = conv;
    this.showNewMsg = false;
    this.loadingMessages = true;
    try {
      // Filtrar mensajes por conversation_id (igual que app móvil)
      const { data } = await this.supabase
        .from('messages')
        .select('id, sender_id, receiver_id, contenido, is_read, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      this.activeMessages = data || [];

      // Marcar como leídos los del estudiante
      const unreadIds = this.activeMessages
        .filter((m: any) => m.sender_id === conv.student.auth_user_id && !m.is_read)
        .map((m: any) => m.id);
      if (unreadIds.length > 0) {
        await this.supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        conv.unread = 0;
      }
    } finally {
      this.loadingMessages = false;
    }
  }

  async sendNewMessage(): Promise<void> {
    if (!this.newMsgInput.trim() || !this.selectedStudentId || this.sendingNew) return;
    this.sendingNew = true;
    try {
      const myAuthId = this.currentAuthId;

      // Obtener auth_user_id del estudiante seleccionado
      const { data: student } = await this.supabase
        .from('app_users').select('auth_user_id').eq('id', this.selectedStudentId).single();
      const studentAuthId = student?.auth_user_id;
      if (!studentAuthId) { alert('No se encontró el usuario'); return; }

      const convId = await this.getOrCreateConversation(myAuthId, studentAuthId);
      const { error } = await this.supabase.from('messages').insert([{
        conversation_id: convId,
        sender_id: myAuthId,
        receiver_id: studentAuthId,
        contenido: this.newMsgInput.trim(),
        is_read: false
      }]);
      if (error) {
        console.error('Error enviando mensaje nuevo:', error);
        alert('Error al enviar: ' + error.message);
      } else {
        this.newMsgInput = '';
        this.showNewMsg = false;
        await this.loadConversations();
      }
    } finally {
      this.sendingNew = false;
    }
  }

  closeConversation(): void {
    this.activeConversation = null;
    this.activeMessages = [];
    this.replyInput = '';
  }

  async sendReply(): Promise<void> {
    if (!this.replyInput.trim() || !this.activeConversation || this.sendingReply) return;
    this.sendingReply = true;
    try {
      const myAuthId = this.currentAuthId;
      const { error } = await this.supabase.from('messages').insert([{
        conversation_id: this.activeConversation.id,
        sender_id: myAuthId,
        receiver_id: this.activeConversation.student.auth_user_id,
        contenido: this.replyInput.trim(),
        is_read: false
      }]);
      if (error) {
        console.error('Error enviando respuesta:', error);
        alert('Error al enviar: ' + error.message);
      } else {
        this.replyInput = '';
        await this.openConversation(this.activeConversation);
      }
    } finally {
      this.sendingReply = false;
    }
  }
}