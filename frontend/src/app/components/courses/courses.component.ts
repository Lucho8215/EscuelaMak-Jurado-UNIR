import { Component, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { Course, Class } from '../../models/course.model';
import { UserRole } from '../../models/user.model';

type ResourceType = 'video' | 'pdf' | 'imagen' | 'contenido';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit, OnDestroy {

  private onOpenMensajes = () => {
    this.openChat('', null);
  };
  // --- DATOS ---
  courses: Course[] = [];
  classes: Class[] = [];
  lessons: any[] = [];  // Lecciones de la clase seleccionada
  // --- SELECCION ---
  selectedCourse: Course | null = null;
  selectedClass: Class | null = null;
  selectedLesson: any | null = null;  // Leccion abierta para ver video/PDF
  activeTab: string = 'info';
  // --- ESTADOS ---
  isLoading = false;
  loadingClasses = false;
  loadingLessons = false;
  // --- USUARIO ---
  isStudent = false;
  currentUserId = '';
  currentAuthId = '';  // auth.users.id para comparar sender_id en mensajes

  // --- PROGRESO DE RECURSOS ---
  // Objeto plano para que Angular detecte cambios: { lessonId: { video: true, pdf: false, ... } }
  lessonViews: Record<string, Record<string, boolean>> = {};
  savingView = false;

  // --- STUDENT_LESSONS: registro de progreso oficial por lección ---
  // Objeto plano: { lessonId: { id, status, progress_percent, ... } }
  studentLessonRecords: Record<string, any> = {};
  completingLesson = false;

  // --- CLASES COMPLETADAS: persiste en localStorage ---
  completedClasses: Record<string, boolean> = {};

  // --- Text-to-Speech ---
  ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  leyendo = false;
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // --- CHAT ---
  showChat = false;
  chatMessages: any[] = [];
  chatInput = '';
  sendingMsg = false;
  loadingMsgs = false;
  chatCourseId: string | null = null;
  chatClassId: string | null = null;
  conversationId: string | null = null;

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private supabaseService: SupabaseService
  ) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }
  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.currentUserId = user.id;
    this.isStudent = user.role === UserRole.STUDENT;
    this.loadCompletedClasses();
    // Guardar auth ID para comparar sender_id en mensajes
    const { data: { user: authUser } } = await this.supabase.auth.getUser();
    this.currentAuthId = authUser?.id ?? '';
    window.addEventListener('escuelamak:open-mensajes', this.onOpenMensajes);
    await this.loadCourses();

    const pendingModal = localStorage.getItem('open_modal');
    if (pendingModal === 'mensajes') {
      localStorage.removeItem('open_modal');
      this.openChat('', null);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('escuelamak:open-mensajes', this.onOpenMensajes);
  }

  // ─── CLASES COMPLETADAS ───────────────────────────────────────────────────

  private storageKey(): string {
    return `completed_classes_${this.currentUserId}`;
  }

  loadCompletedClasses(): void {
    try {
      const raw = localStorage.getItem(this.storageKey());
      this.completedClasses = raw ? JSON.parse(raw) : {};
    } catch {
      this.completedClasses = {};
    }
  }

  isClassCompleted(clase: any): boolean {
    return this.completedClasses[clase.id] === true;
  }

  private markClassAsCompleted(classId: string): void {
    this.completedClasses = { ...this.completedClasses, [classId]: true };
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.completedClasses));
    } catch { /* silencioso */ }
  }
  // --- EMOJIS ---
  getCourseEmoji(category: string): string {
    const emojis: any = {
      'mathematics': '🔢',
      'education': '📚',
      'algebra': '➗'
    };
    return emojis[category] || '📖';
  }
  // --- INSCRIPCIONES ---
  async getMyEnrollments(): Promise<any[]> {
    try {
      const supabase = (this.courseService as any).supabase;
      const { data } = await supabase
        .from('class_enrollments')
        .select('course_id, class_id')
        .eq('student_id', this.currentUserId)
        .eq('status', 'active');
      return (data || []).map((e: any) => ({
        courseId: e.course_id,
        classId: e.class_id
      }));
    } catch {
      return [];
    }
  }
  // --- CARGAR CURSOS ---
  async loadCourses() {
    try {
      this.isLoading = true;
      const all = await this.courseService.getCourses();
      if (this.isStudent) {
        const myEnrollments = await this.getMyEnrollments();
        const myCourseIds = [...new Set(myEnrollments.map((e: any) => e.courseId))];
        this.courses = all.filter(c => myCourseIds.includes(c.id) && c.isVisible);
      } else {
        this.courses = all.filter(c => c.isVisible);
      }
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      this.isLoading = false;
    }
  }
  // --- ABRIR MODAL DE CLASES ---
  async viewCourseDetails(course: Course) {
    this.selectedCourse = course;
    this.selectedClass = null;
    this.selectedLesson = null;
    this.lessons = [];
    this.classes = [];
    try {
      this.loadingClasses = true;
      const allClasses = await this.courseService.getClasses(course.id);
      if (this.isStudent) {
        const myEnrollments = await this.getMyEnrollments();
        const myClassIds = myEnrollments
          .filter((e: any) => e.courseId === course.id)
          .map((e: any) => e.classId);
        this.classes = allClasses.filter(c => myClassIds.includes(c.id));
      } else {
        this.classes = allClasses;
      }
    } catch (error) {
      console.error('Error al cargar clases:', error);
    } finally {
      this.loadingClasses = false;
    }
  }
  // --- SELECCIONAR CLASE Y CARGAR LECCIONES ---
  async selectClass(clase: Class) {
    if (this.selectedClass?.id === clase.id) {
      this.selectedClass = null;
      this.lessons = [];
      this.selectedLesson = null;
      return;
    }
    this.selectedClass = clase;
    this.selectedLesson = null;
    this.activeTab = 'info';
    this.lessons = [];
    try {
      this.loadingLessons = true;
      const allLessons = await this.courseService.getLessonsByClass(clase.id);
      this.lessons = allLessons;
      // Si no hay lecciones pero la clase tiene imagen, PDF o enlace, crear una "lección virtual"
      if (allLessons.length === 0 && this.classHasResources(clase)) {
        this.lessons = [this.classAsVirtualLesson(clase)];
      }
      // Cargar progreso de recursos vistos y registros de student_lessons
      await Promise.all([
        this.loadAllLessonViews(),
        this.loadStudentLessonRecords(clase.id)
      ]);
    } catch (error) {
      console.error('Error al cargar lecciones:', error);
    } finally {
      this.loadingLessons = false;
    }
  }

  /** Indica si la clase tiene recursos (imagen, PDF, enlace) para mostrar */
  classHasResources(clase: Class): boolean {
    return !!(clase.imageUrl || clase.resourceFileUrl || clase.resourceLink);
  }

  /** Convierte la clase en un objeto tipo lección para mostrarla en la vista */
  classAsVirtualLesson(clase: Class): any {
    return {
      id: `class-${clase.id}`,
      title: clase.name,
      name: clase.name,
      resourceLink: clase.resourceLink,
      resource_link: clase.resourceLink,
      resourceFileUrl: clase.resourceFileUrl,
      resource_file_url: clase.resourceFileUrl,
      coverImageUrl: clase.imageUrl,
      cover_image_url: clase.imageUrl,
      imageUrl: clase.imageUrl,
      videoUrl: clase.resourceLink,
      video_url: clase.resourceLink,
      observation: clase.observation,
      summary: clase.observation,
      order: 1,
      orderIndex: 1
    };
  }
  // --- SELECCIONAR LECCION ---
  selectLesson(lesson: any) {
    if (this.selectedLesson?.id === lesson.id) {
      this.selectedLesson = null;
    } else {
      this.selectedLesson = lesson;
      // Auto-seleccionar la pestaña multimedia si hay video o PDF
      if (this.lessonHasVideo(lesson)) {
        this.activeTab = 'video';
        this.markResourceViewed(lesson.id, 'video');
      } else if (this.lessonHasPdf(lesson)) {
        this.activeTab = 'pdf';
        this.markResourceViewed(lesson.id, 'pdf');
      } else {
        this.activeTab = 'información';
        this.markResourceViewed(lesson.id, 'contenido');
      }
    }
  }

  // --- PESTANAS ---
  setTab(tab: 'información' | 'video' | 'pdf' | 'multimedia' | 'imagen' | 'recurso') {
    this.activeTab = tab;
    if (!this.selectedLesson) return;
    const lessonId = this.selectedLesson.id;
    if (tab === 'video')       this.markResourceViewed(lessonId, 'video');
    if (tab === 'pdf')         this.markResourceViewed(lessonId, 'pdf');
    if (tab === 'imagen')      this.markResourceViewed(lessonId, 'imagen');
    if (tab === 'información') this.markResourceViewed(lessonId, 'contenido');
  }
  // --- DETECTAR CONTENIDO DE LECCION ---
  lessonHasVideo(lesson: any): boolean {
    const link = lesson.resource_link || lesson.resourceLink || '';
    const video = lesson.video_url || lesson.videoUrl || '';
    const url = link || video;
    return !!(url.includes('youtube') || url.includes('vimeo') || url.includes('embed') ||
              url.match(/\.(mp4|webm|ogg)(\?|$)/i));
  }
  lessonHasPdf(lesson: any): boolean {
    const file = lesson.resource_file_url || lesson.resourceFileUrl || '';
    return file.toLowerCase().includes('.pdf');
  }
  lessonHasImage(lesson: any): boolean {
    const img = lesson.image_url || lesson.imageUrl || lesson.cover_image_url || lesson.coverImageUrl || '';
    return !!img;
  }
  lessonHasLink(lesson: any): boolean {
    const link = lesson.resource_link || lesson.resourceLink || '';
    return !!link && !this.lessonHasVideo(lesson);
  }
  // --- OBTENER URLs DE LECCION ---
  getLessonVideoUrl(lesson: any): string {
    const link = lesson.resource_link || lesson.resourceLink || '';
    const video = lesson.video_url || lesson.videoUrl || '';
    const file = lesson.resource_file_url || lesson.resourceFileUrl || '';
    if (link && (link.includes('youtube') || link.includes('vimeo') || link.includes('embed') || link.match(/\.(mp4|webm|ogg)(\?|$)/i)))
      return link;
    if (video) return video;
    if (file && file.match(/\.(mp4|webm|ogg)(\?|$)/i)) return file;
    return link || video;
  }
  getLessonPdfUrl(lesson: any): string {
    return lesson.resource_file_url || lesson.resourceFileUrl || '';
  }
  getLessonImageUrl(lesson: any): string {
    return lesson.image_url || lesson.imageUrl ||
           lesson.cover_image_url || lesson.coverImageUrl || '';
  }
  getLessonLink(lesson: any): string {
    return lesson.resource_link || lesson.resourceLink || '';
  }
  getLessonObservation(lesson: any): string {
    return lesson.observation || lesson.summary || '';
  }
  getLessonName(lesson: any): string {
    return lesson.name || lesson.title || 'Sin nombre';
  }
  getLessonNumber(lesson: any): number {
    return lesson.order || lesson.order_index || lesson.orderIndex || 0;
  }
  /* --- CHIPS DE CLASE (basado en sus lecciones) ---
  hasVideo(clase: Class): boolean {
    return this.lessons.some(l => this.lessonHasVideo(l));
  }*/
    // Considera que hay video si resource_link contiene YouTube
  // o si tiene videoUrl directo

  hasVideo(clase: Class): boolean {
    const link = clase.resourceLink || '';
    const video = clase.videoUrl || '';
    return link.includes('youtube') || link.includes('youtu.be') ||
           link.includes('embed') || video.includes('youtube') ||
           video.includes('youtu.be');
  }
  hasPdf(clase: Class): boolean {
    return this.lessons.some(l => this.lessonHasPdf(l));
  }
  hasImage(clase: Class): boolean {
    return this.lessons.some(l => this.lessonHasImage(l));
  }
  /**
   * Obtiene la URL embebida del video (YouTube, Vimeo o MP4 directo).
   * Evita redirigir a URLs externas: todo se ve dentro del modal.
   */
  getVideoEmbedUrl(url: string): SafeResourceUrl {
    if (!url || !url.trim()) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const u = url.trim();
    // YouTube
    let videoId = '';
    if (u.includes('youtube.com/watch?v=')) {
      videoId = u.split('watch?v=')[1]?.split('&')[0] || '';
    } else if (u.includes('youtu.be/')) {
      videoId = u.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (u.includes('youtube.com/embed/')) {
      videoId = u.split('embed/')[1]?.split('?')[0] || '';
    }
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${videoId}?rel=0`
      );
    }
    // Vimeo
    const vimeoMatch = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://player.vimeo.com/video/${vimeoMatch[1]}`
      );
    }
    // Video directo (MP4, WebM, etc.)
    if (u.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(u);
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(u);
  }

  /**
   * Indica si la URL es un video directo (MP4, WebM) para usar <video> en lugar de <iframe>.
   */
  isDirectVideoUrl(url: string): boolean {
    return !!url?.match(/\.(mp4|webm|ogg)(\?|$)/i);
  }

  /**
   * URL embebida del PDF: se muestra directamente en iframe, sin redirigir a Google Viewer.
   * El PDF se visualiza dentro del mismo modal.
   */
  getPdfEmbedUrl(url: string): SafeResourceUrl {
    if (!url || !url.trim()) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url.trim());
  }
  isPdf(url: string): boolean {
    return url?.toLowerCase().includes('.pdf') || false;
  }

  /**
   * Detecta si el recurso/link es un video (YouTube, Vimeo, o archivo de video directo)
   */
  isVideoResource(url: string | undefined): boolean {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes('youtube.com') || 
           u.includes('youtu.be') || 
           u.includes('vimeo.com') || 
           u.match(/\.(mp4|webm|ogg)(\?|$)/i) !== null;
  }

  /**
   * Obtiene la URL embedida para el recurso (si es un video)
   */
  getVideoEmbedUrlFromResource(url: string | undefined): SafeResourceUrl {
    return this.getVideoEmbedUrl(url || '');
  }

  /**
   * Indica si la URL del recurso es un video directo (MP4, WebM) para usar video en lugar de iframe
   */
  isDirectVideoResource(url: string | undefined): boolean {
    return this.isDirectVideoUrl(url || '');
  }

  // ─── TRACKING DE RECURSOS VISTOS ─────────────────────────────────────────

  // ─── STUDENT_LESSONS: PROGRESO OFICIAL ──────────────────────────────────

  /** Carga los registros student_lessons del alumno para la clase actual */
  async loadStudentLessonRecords(classId: string): Promise<void> {
    if (!this.currentUserId || !classId) return;
    try {
      const { data } = await this.supabase
        .from('student_lessons')
        .select('id, lesson_id, status, progress_percent, started_at, completed_at')
        .eq('class_id', classId)
        .eq('student_id', this.currentUserId);

      const records: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { records[r.lesson_id] = r; });
      this.studentLessonRecords = records;
    } catch { /* silencioso */ }
  }

  getStudentLessonRecord(lessonId: string): any {
    return this.studentLessonRecords[lessonId] ?? null;
  }

  getLessonStatus(lessonId: string): string {
    return this.studentLessonRecords[lessonId]?.status ?? 'not_assigned';
  }

  /**
   * El estudiante presiona "Completar lección".
   * Marca status=completed, progress=100 en student_lessons.
   */
  async completeLesson(lesson: any): Promise<void> {
    if (this.completingLesson) return;
    this.completingLesson = true;

    // Actualizar UI inmediatamente
    const existing = this.studentLessonRecords[lesson.id] ?? {};
    this.studentLessonRecords = {
      ...this.studentLessonRecords,
      [lesson.id]: { ...existing, status: 'completed', progress_percent: 100 }
    };

    // Persistir en BD
    if (this.currentUserId) {
      const now = new Date().toISOString();
      try {
        if (existing?.id) {
          // Registro existente → actualizar
          await this.supabase
            .from('student_lessons')
            .update({ status: 'completed', progress_percent: 100, completed_at: now, updated_at: now })
            .eq('id', existing.id);
        } else {
          // Sin registro previo → insertar
          const { data } = await this.supabase
            .from('student_lessons')
            .upsert({
              student_id: this.currentUserId,
              lesson_id: lesson.id,
              class_id: this.selectedClass?.id ?? '',
              course_id: this.selectedCourse?.id ?? '',
              status: 'completed',
              progress_percent: 100,
              is_active: true,
              completed_at: now,
              started_at: now,
              updated_at: now
            }, { onConflict: 'student_id,lesson_id,class_id' })
            .select('id')
            .single();
          // Guardar el id para futuras actualizaciones
          if (data?.id) {
            this.studentLessonRecords = {
              ...this.studentLessonRecords,
              [lesson.id]: { ...this.studentLessonRecords[lesson.id], id: data.id }
            };
          }
        }
      } catch (e) {
        console.error('Error guardando lección completada:', e);
      }
    }

    // Marcar la clase como completada (persiste en localStorage)
    if (this.selectedClass) {
      this.markClassAsCompleted(this.selectedClass.id);
    }

    this.completingLesson = false;
  }

  // ─── TRACKING DE RECURSOS VISTOS ─────────────────────────────────────────

  /** Carga vistas de todas las lecciones de la clase actual */
  async loadAllLessonViews(): Promise<void> {
    if (!this.currentUserId || this.lessons.length === 0) return;
    const ids = this.lessons.map((l: any) => l.id).filter((id: string) => !String(id).startsWith('class-'));
    if (ids.length === 0) return;
    try {
      const { data } = await this.supabase
        .from('lesson_resource_views')
        .select('lesson_id, resource_type')
        .eq('student_id', this.currentUserId)
        .in('lesson_id', ids);

      const views: Record<string, Record<string, boolean>> = {};
      (data ?? []).forEach((r: any) => {
        if (!views[r.lesson_id]) views[r.lesson_id] = {};
        views[r.lesson_id][r.resource_type] = true;
      });
      this.lessonViews = views;
    } catch { /* silencioso */ }
  }

  /**
   * Marca un recurso como visto.
   * La actualización de la UI es SINCRÓNICA para que Angular detecte el cambio
   * en el mismo ciclo de eventos. La persistencia en BD se hace aparte.
   */
  markResourceViewed(lessonId: string, resourceType: ResourceType): void {
    if (!lessonId || lessonId.startsWith('class-')) return;
    if (this.isResourceViewed(lessonId, resourceType)) return;

    // Nueva referencia de objeto → Angular detecta el cambio en este mismo ciclo
    this.lessonViews = {
      ...this.lessonViews,
      [lessonId]: { ...(this.lessonViews[lessonId] ?? {}), [resourceType]: true }
    };

    // Persistir en BD de forma asíncrona (fire-and-forget)
    if (this.currentUserId) {
      this.persistResourceView(lessonId, resourceType);
    }
  }

  private async persistResourceView(lessonId: string, resourceType: ResourceType): Promise<void> {
    try {
      await this.supabase.from('lesson_resource_views').upsert({
        student_id: this.currentUserId,
        lesson_id: lessonId,
        resource_type: resourceType,
        viewed_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id,resource_type' });

      // Pasar a in_progress si la lección estaba solo assigned
      const record = this.getStudentLessonRecord(lessonId);
      if (record && record.status === 'assigned') {
        await this.supabase.from('student_lessons').update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', record.id);
        this.studentLessonRecords = {
          ...this.studentLessonRecords,
          [lessonId]: { ...record, status: 'in_progress' }
        };
      }
    } catch { /* silencioso */ }
  }

  /** Verifica si un recurso fue visto */
  isResourceViewed(lessonId: string, resourceType: ResourceType): boolean {
    return this.lessonViews[lessonId]?.[resourceType] === true;
  }

  /** Cuántos recursos tiene la lección en total */
  getLessonTotalResources(lesson: any): number {
    let total = 1; // contenido/info siempre cuenta
    if (this.lessonHasVideo(lesson)) total++;
    if (this.lessonHasPdf(lesson)) total++;
    if (this.lessonHasImage(lesson)) total++;
    return total;
  }

  /** Cuántos recursos ha visto el estudiante en esta lección */
  getLessonViewedCount(lesson: any): number {
    const viewed = this.lessonViews[lesson.id] ?? {};
    let count = 0;
    if (viewed['contenido']) count++;
    if (viewed['video'] && this.lessonHasVideo(lesson)) count++;
    if (viewed['pdf'] && this.lessonHasPdf(lesson)) count++;
    if (viewed['imagen'] && this.lessonHasImage(lesson)) count++;
    return count;
  }

  /** True si la lección fue marcada como completada */
  isLessonCompleted(lesson: any): boolean {
    return this.getLessonStatus(lesson.id) === 'completed';
  }

  /** Progreso de la lección: 100 si completada, si no el valor guardado en student_lessons */
  getLessonProgressPct(lesson: any): number {
    if (this.isLessonCompleted(lesson)) return 100;
    return this.studentLessonRecords[lesson.id]?.progress_percent ?? 0;
  }

  /** Cuenta lecciones completadas */
  getCompletedLessonsCount(): number {
    return this.lessons.filter(l => this.isLessonCompleted(l)).length;
  }

  /** Progreso global: porcentaje de lecciones completadas */
  getCourseProgressPct(): number {
    if (this.lessons.length === 0) return 0;
    return Math.round((this.getCompletedLessonsCount() / this.lessons.length) * 100);
  }

  // ─── CERRAR MODALES ──────────────────────────────────────────────────────
  closeModal() {
    this.selectedCourse = null;
    this.selectedClass = null;
    this.selectedLesson = null;
    this.classes = [];
    this.lessons = [];
  }

  // --- LEER EN VOZ ALTA ---
  leerLeccion(lesson: any | null): void {
    if (!lesson || !this.ttsSupported || !this.synth) return;
    if (this.leyendo) {
      this.synth.cancel();
      this.leyendo = false;
      return;
    }
    const partes: string[] = [];
    if (this.getLessonName(lesson)) partes.push(this.getLessonName(lesson));
    if (this.getLessonObservation(lesson)) partes.push(this.getLessonObservation(lesson));
    if (partes.length === 0) {
      partes.push('Esta lección no tiene contenido de texto para leer.');
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

  leerCurso(curso: any | null): void {
    if (!curso || !this.ttsSupported || !this.synth) return;
    if (this.leyendo) {
      this.synth.cancel();
      this.leyendo = false;
      return;
    }
    const partes: string[] = [];
    if (curso.title) partes.push(curso.title);
    if (curso.description) partes.push(curso.description);
    if (partes.length === 0) {
      partes.push('Este curso no tiene contenido de texto para leer.');
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

  leerClase(clase: any | null): void {
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

  // ─── CHAT ────────────────────────────────────────────────────────────────

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

  async openChat(courseId: string, classId: string | null = null): Promise<void> {
    this.chatCourseId = courseId;
    this.chatClassId = classId;
    this.showChat = true;

    const myAuthId = this.currentAuthId;
    if (!myAuthId) { await this.loadChatMessages(); return; }

    // 1. Buscar conversación existente donde participa el estudiante
    const { data: convs } = await this.supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [myAuthId])
      .order('last_message_at', { ascending: false })
      .limit(1);

    if (convs && convs.length > 0) {
      this.conversationId = convs[0].id;
    } else {
      // 2. No existe — crear con el primer admin/teacher disponible
      const { data: staffList } = await this.supabase
        .from('app_users')
        .select('auth_user_id')
        .in('role', ['admin', 'teacher'])
        .not('auth_user_id', 'is', null)
        .limit(1);
      const staffAuthId = staffList?.[0]?.auth_user_id;
      if (staffAuthId) {
        this.conversationId = await this.getOrCreateConversation(myAuthId, staffAuthId);
      }
    }

    await this.loadChatMessages();
  }

  closeChat(): void {
    this.showChat = false;
    this.chatMessages = [];
    this.chatInput = '';
    this.conversationId = null;
  }

  async loadChatMessages(): Promise<void> {
    this.loadingMsgs = true;
    try {
      if (!this.conversationId) { this.chatMessages = []; return; }

      // Cargar mensajes de esta conversación (igual que app móvil)
      const { data: msgs } = await this.supabase
        .from('messages')
        .select('id, sender_id, receiver_id, contenido, is_read, created_at')
        .eq('conversation_id', this.conversationId)
        .order('created_at', { ascending: true });

      if (!msgs || msgs.length === 0) { this.chatMessages = []; return; }

      // Obtener nombres de usuarios involucrados
      const userIds = [...new Set([
        ...msgs.map((m: any) => m.sender_id),
        ...msgs.map((m: any) => m.receiver_id).filter(Boolean)
      ])];
      const { data: users } = await this.supabase
        .from('app_users')
        .select('auth_user_id, name, role')
        .in('auth_user_id', userIds);
      const userMap = new Map((users || []).map((u: any) => [u.auth_user_id, u]));

      this.chatMessages = msgs.map((m: any) => ({
        ...m,
        sender: userMap.get(m.sender_id) ?? { name: 'Usuario', role: '' }
      }));

      // Marcar como leídos los mensajes recibidos
      const myAuthId = this.currentAuthId;
      const unread = this.chatMessages
        .filter((m: any) => m.receiver_id === myAuthId && !m.is_read)
        .map((m: any) => m.id);
      if (unread.length > 0) {
        await this.supabase.from('messages').update({ is_read: true }).in('id', unread);
      }
    } finally {
      this.loadingMsgs = false;
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.chatInput.trim() || this.sendingMsg) return;
    this.sendingMsg = true;
    try {
      const myAuthId = this.currentAuthId;

      // Asegurar que existe la conversación
      if (!this.conversationId) {
        const { data: staffList } = await this.supabase
          .from('app_users')
          .select('auth_user_id')
          .in('role', ['admin', 'teacher'])
          .limit(1);
        const staffAuthId = staffList?.[0]?.auth_user_id;
        if (staffAuthId) {
          this.conversationId = await this.getOrCreateConversation(myAuthId, staffAuthId);
        }
      }

      if (!this.conversationId) { alert('No hay tutor disponible'); return; }

      // Obtener receiver (el otro participante de la conversación)
      const { data: conv } = await this.supabase
        .from('conversations').select('participant_ids').eq('id', this.conversationId).single();
      const receiverId = (conv?.participant_ids as string[])?.find((id: string) => id !== myAuthId) ?? null;

      const { error } = await this.supabase.from('messages').insert([{
        conversation_id: this.conversationId,
        sender_id: myAuthId,
        receiver_id: receiverId,
        contenido: this.chatInput.trim(),
        is_read: false
      }]);
      if (error) {
        console.error('Error enviando mensaje:', error);
        alert('Error al enviar: ' + error.message);
      } else {
        this.chatInput = '';
        await this.loadChatMessages();
      }
    } finally {
      this.sendingMsg = false;
    }
  }
}