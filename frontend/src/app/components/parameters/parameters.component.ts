import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  password_hash?: string;
}

interface PermissionCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  roles: string[];
  enabled: boolean;
  category: string;
}

interface PlatformPermission {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  admin_enabled: boolean;
  teacher_enabled: boolean;
  tutor_enabled: boolean;
  student_enabled: boolean;
}

interface SchoolConfig {
  id: string;
  school_name: string;
  school_description: string;
  school_logo_url: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  active_theme: string;
}

interface PlatformMetric {
  id: string;
  metric_key: string;
  metric_name: string;
  metric_value: string;
  metric_type: string;
  is_visible: boolean;
  display_order: number;
}

interface ThemeOption {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  preview: string[];
}

interface CourseOption {
  id: string;
  title: string;
}

interface ClassItem {
  id: string;
  name?: string;
  title?: string;
  status: string;
  course_id?: string | null;
  max_students?: number;
  enrollment_count?: number;
  start_date?: string | null;
  end_date?: string | null;
}

interface UserForm {
  name: string;
  email: string;
  role: string;
  password: string;
}

interface ClassForm {
  name: string;
  course_id: string;
  status: string;
  max_students: number;
  start_date: string;
  end_date: string;
}

interface SchoolForm {
  school_name: string;
  school_description: string;
  school_logo_url: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  font_family: string;
}

interface MetricForm {
  metric_key: string;
  metric_name: string;
  metric_value: string;
  metric_type: string;
  is_visible: boolean;
  display_order: number;
}

interface DeleteConfirm {
  type: string;
  id: string;
  name: string;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * NUEVAS INTERFACES PARA SISTEMA DE PERMISOS GRANULARES
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Representa un permiso granular con tres niveles de acceso:
 * - view: Puede ver/consultar el módulo
 * - create: Puede crear nuevos elementos
 * - edit: Puede modificar y eliminar elementos
 */
interface GranularPermission {
  id: string;
  module_key: string;      // Identificador único del módulo
  module_name: string;      // Nombre visual del módulo
  module_icon: string;      // Icono de FontAwesome
  module_color: string;     // Color hex para el módulo
  category: string;         // Categoría del módulo
  description: string;      // Descripción breve
  view_enabled: boolean;    // Permiso para ver
  create_enabled: boolean;  // Permiso para crear
  edit_enabled: boolean;    // Permiso para editar
}

/**
 * Representa un rol personalizado en el sistema.
 * Los roles pueden ser creados, editados y eliminados por el administrador.
 */
interface CustomRole {
  id: string;
  name: string;             // Nombre del rol (ej: "Profesor de Matemáticas")
  code: string;              // Código único (ej: "math_teacher")
  description: string;       // Descripción del rol
  color: string;            // Color representativo del rol
  icon: string;             // Icono del rol
  is_default: boolean;      // Si es un rol del sistema (no eliminable)
  permissions: RolePermission[];  // Lista de permisos del rol
  created_at?: string;
}

/**
 * Representa un permiso específico asignado a un rol.
 * Define qué acciones puede realizar un rol en un módulo específico.
 */
interface RolePermission {
  module_key: string;       // Referencia al módulo
  can_view: boolean;        // Puede ver el módulo
  can_create: boolean;      // Puede crear elementos
  can_edit: boolean;        // Puede editar elementos
}

/**
 * Formulario para crear o editar un rol.
 */
interface RoleForm {
  name: string;
  code: string;
  description: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.css']
})
export class ParametersComponent implements OnInit {
  activeSection = 'users';
  loading = false;
  successMsg = '';
  errorMsg = '';

  // Datos de usuarios
  users: AppUser[] = [];
  filteredUsers: AppUser[] = [];
  searchUser = '';
  filterRole = '';
  showUserModal = false;
  editingUser: AppUser | null = null;
  userForm: UserForm = this.emptyUserForm();
  userFormErrors: Record<string, string> = {};

  // Datos de clases
  classes: ClassItem[] = [];
  filteredClasses: ClassItem[] = [];
  searchClass = '';
  showClassModal = false;
  editingClass: ClassItem | null = null;
  classForm: ClassForm = this.emptyClassForm();

  courses: CourseOption[] = [];

  // Configuración de temas
  selectedTheme = 'default';
  themes: ThemeOption[] = [
    { id: 'default', name: 'Arcoíris Mágico', primary: '#667eea', secondary: '#764ba2', accent: '#f093fb', bg: '#f0f2ff', preview: ['#667eea', '#764ba2', '#f093fb', '#4facfe'] },
    { id: 'ocean', name: 'Océano Profundo', primary: '#0093E9', secondary: '#80D0C7', accent: '#00f5d4', bg: '#e8f8ff', preview: ['#0093E9', '#80D0C7', '#00f5d4', '#43e97b'] },
    { id: 'sunset', name: 'Atardecer Tropical', primary: '#f7971e', secondary: '#ffd200', accent: '#ff6b6b', bg: '#fff8e7', preview: ['#f7971e', '#ffd200', '#ff6b6b', '#ff9a9e'] },
    { id: 'forest', name: 'Bosque Encantado', primary: '#11998e', secondary: '#38ef7d', accent: '#56ab2f', bg: '#efffef', preview: ['#11998e', '#38ef7d', '#56ab2f', '#a8ff78'] },
    { id: 'galaxy', name: 'Galaxia Espacial', primary: '#2c3e50', secondary: '#4ca1af', accent: '#c0392b', bg: '#f0f4f8', preview: ['#2c3e50', '#4ca1af', '#c0392b', '#8e44ad'] },
    { id: 'candy', name: 'Dulcería Feliz', primary: '#ff758c', secondary: '#ff7eb3', accent: '#ffd6e0', bg: '#fff0f5', preview: ['#ff758c', '#ff7eb3', '#a78bfa', '#fbbf24'] }
  ];

  // Tipografías disponibles
  availableFonts = [
    { id: 'comic',      name: 'Divertida',    family: "'Comic Sans MS', cursive",       sample: 'Aa',  google: null },
    { id: 'nunito',     name: 'Redondeada',   family: "'Nunito', sans-serif",            sample: 'Aa',  google: 'Nunito:400,600,700' },
    { id: 'poppins',    name: 'Moderna',      family: "'Poppins', sans-serif",           sample: 'Aa',  google: 'Poppins:400,500,600,700' },
    { id: 'fredoka',    name: 'Juguetona',    family: "'Fredoka One', cursive",          sample: 'Aa',  google: 'Fredoka+One' },
    { id: 'quicksand',  name: 'Liviana',      family: "'Quicksand', sans-serif",         sample: 'Aa',  google: 'Quicksand:400,500,600,700' },
    { id: 'montserrat', name: 'Profesional',  family: "'Montserrat', sans-serif",        sample: 'Aa',  google: 'Montserrat:400,500,600,700' },
    { id: 'opensans',   name: 'Clásica',      family: "'Open Sans', sans-serif",         sample: 'Aa',  google: 'Open+Sans:400,600,700' },
    { id: 'pacifico',   name: 'Caligráfica',  family: "'Pacifico', cursive",             sample: 'Aa',  google: 'Pacifico' },
  ];
  selectedFontId = 'comic';

  // Permisos de tarjetas (locales)
  permissionCards: PermissionCard[] = [
    { id: 'card_courses', title: 'Ver Cursos', description: 'Acceso a la lista de cursos disponibles', icon: 'fas fa-book-open', color: '#667eea', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Contenido' },
    { id: 'card_classes', title: 'Gestión de Clases', description: 'Crear, editar y eliminar clases', icon: 'fas fa-chalkboard-teacher', color: '#f7971e', roles: ['admin', 'teacher'], enabled: true, category: 'Gestión' },
    { id: 'card_quiz', title: 'Quizzes', description: 'Crear y gestionar evaluaciones', icon: 'fas fa-brain', color: '#11998e', roles: ['admin', 'teacher'], enabled: true, category: 'Evaluación' },
    { id: 'card_takequiz', title: 'Tomar Quiz', description: 'Resolver evaluaciones y quizzes', icon: 'fas fa-pencil-alt', color: '#ff758c', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Evaluación' },
    { id: 'card_reports', title: 'Informes', description: 'Ver reportes y estadísticas de alumnos', icon: 'fas fa-chart-bar', color: '#4ca1af', roles: ['admin', 'tutor'], enabled: true, category: 'Informes' },
    { id: 'card_users', title: 'Gestión Usuarios', description: 'Administrar cuentas de usuarios', icon: 'fas fa-users-cog', color: '#764ba2', roles: ['admin'], enabled: true, category: 'Administración' },
    { id: 'card_settings', title: 'Parámetros', description: 'Configurar parámetros del sistema', icon: 'fas fa-sliders-h', color: '#2c3e50', roles: ['admin'], enabled: true, category: 'Administración' },
    { id: 'card_lessons', title: 'Lecciones', description: 'Ver y completar lecciones asignadas', icon: 'fas fa-graduation-cap', color: '#56ab2f', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Contenido' },
    { id: 'card_review', title: 'Practicar', description: 'Área de práctica y ejercicios', icon: 'fas fa-star', color: '#ffd200', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Contenido' }
  ];

  // Permisos desde Supabase (backend)
  platformPermissions: PlatformPermission[] = [];
  
  // Configuración de la escuela
  schoolConfig: SchoolConfig | null = null;
  showSchoolModal = false;
  schoolForm: SchoolForm = this.emptySchoolForm();
  
  // Métricas
  platformMetrics: PlatformMetric[] = [];
  showMetricModal = false;
  editingMetric: PlatformMetric | null = null;
  metricForm: MetricForm = this.emptyMetricForm();
  
  // Upload
  uploadingFile = false;
  uploadedFileUrl = '';

  filterCardCategory = 'all';
  filterCardRole = 'all';
  cardCategories: string[] = [];
  roles = ['admin', 'teacher', 'tutor', 'student'];
  deleteConfirm: DeleteConfirm | null = null;

  // ═══════════════════════════════════════════════════════════════
  // NUEVAS PROPIEDADES PARA SISTEMA DE PERMISOS GRANULARES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Lista de módulos/funcionalidades del sistema con permisos granulares.
   * Cada módulo tiene tres niveles: ver, crear, editar.
   */
  granularPermissions: GranularPermission[] = [
    // Módulos de Contenido
    { id: 'mod_courses', module_key: 'courses', module_name: 'Cursos', module_icon: 'fas fa-book-open', module_color: '#667eea', category: 'Contenido', description: 'Gestión de cursos y lecciones', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_lessons', module_key: 'lessons', module_name: 'Lecciones', module_icon: 'fas fa-graduation-cap', module_color: '#56ab2f', category: 'Contenido', description: 'Lecciones y materiales de estudio', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_classes', module_key: 'classes', module_name: 'Clases', module_icon: 'fas fa-chalkboard-teacher', module_color: '#f7971e', category: 'Contenido', description: 'Gestión de clases y grupos', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_quizzes', module_key: 'quizzes', module_name: 'Quizzes', module_icon: 'fas fa-brain', module_color: '#11998e', category: 'Evaluación', description: 'Evaluaciones y exámenes', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_take_quiz', module_key: 'take_quiz', module_name: 'Realizar Quiz', module_icon: 'fas fa-pencil-alt', module_color: '#ff758c', category: 'Evaluación', description: 'Resolver evaluaciones', view_enabled: true, create_enabled: false, edit_enabled: false },
    { id: 'mod_practice', module_key: 'practice', module_name: 'Práctica', module_icon: 'fas fa-star', module_color: '#ffd200', category: 'Contenido', description: 'Área de práctica y ejercicios', view_enabled: true, create_enabled: false, edit_enabled: false },
    // Módulos de Gestión
    { id: 'mod_users', module_key: 'users', module_name: 'Usuarios', module_icon: 'fas fa-users', module_color: '#764ba2', category: 'Administración', description: 'Gestión de usuarios del sistema', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_roles', module_key: 'roles', module_name: 'Roles', module_icon: 'fas fa-user-shield', module_color: '#8b5cf6', category: 'Administración', description: 'Crear y editar roles', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_settings', module_key: 'settings', module_name: 'Parámetros', module_icon: 'fas fa-sliders-h', module_color: '#2c3e50', category: 'Administración', description: 'Configuración general', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_reports', module_key: 'reports', module_name: 'Informes', module_icon: 'fas fa-chart-bar', module_color: '#4ca1af', category: 'Informes', description: 'Reportes y estadísticas', view_enabled: true, create_enabled: false, edit_enabled: false },
    { id: 'mod_school', module_key: 'school', module_name: 'Escuela', module_icon: 'fas fa-school', module_color: '#06b6d4', category: 'Administración', description: 'Configuración de la escuela', view_enabled: true, create_enabled: true, edit_enabled: true },
    { id: 'mod_metrics', module_key: 'metrics', module_name: 'Métricas', module_icon: 'fas fa-chart-line', module_color: '#f59e0b', category: 'Informes', description: 'Métricas de la plataforma', view_enabled: true, create_enabled: true, edit_enabled: true }
  ];

  /**
   * Lista de roles personalizados.
   * Incluye roles por defecto del sistema y roles creados por el usuario.
   */
  customRoles: CustomRole[] = [];

  /**
   * Rol actualmente seleccionado para editar sus permisos.
   */
  selectedRole: CustomRole | null = null;

  /**
   * Variables para modales de roles.
   */
  showRoleModal = false;
  editingRole: CustomRole | null = null;
  roleForm: RoleForm = this.emptyRoleForm();

  /**
   * Pestaña activa en la sección de permisos.
   * Valores: 'modules' (módulos), 'roles' (gestión de roles).
   */
  permissionsTab: 'modules' | 'roles' = 'modules';

  /**
   * Categorías disponibles para módulos.
   */
  moduleCategories: string[] = ['Contenido', 'Evaluación', 'Administración', 'Informes'];

  /**
   * Filtro de categoría en la vista de módulos.
   */
  filterModuleCategory = 'all';

  /**
   * Búsqueda de módulos.
   */
  searchModule = '';

  /**
   * Mapa de iconos disponibles para roles.
   */
  roleIcons = [
    { code: 'fas fa-user-graduate', name: 'Estudiante' },
    { code: 'fas fa-chalkboard-teacher', name: 'Profesor' },
    { code: 'fas fa-user-friends', name: 'Tutor' },
    { code: 'fas fa-crown', name: 'Administrador' },
    { code: 'fas fa-book-reader', name: 'Instructor' },
    { code: 'fas fa-hands-helping', name: 'Asistente' },
    { code: 'fas fa-clipboard-check', name: 'Evaluador' },
    { code: 'fas fa-chart-pie', name: 'Analista' }
  ];

  /**
   * Colores disponibles para roles.
   */
  roleColors = [
    '#667eea', '#f7971e', '#11998e', '#ff758c',
    '#764ba2', '#4ca1af', '#f59e0b', '#06b6d4',
    '#8b5cf6', '#ec4899', '#10b981', '#6366f1'
  ];

  // ═══════════════════════════════════════════════════════════════
  // CURSOS ASIGNADOS
  // ═══════════════════════════════════════════════════════════════
  students: AppUser[] = [];
  filteredStudents: AppUser[] = [];
  searchStudent = '';

  // Modal de cursos asignados del estudiante
  showEnrollmentModal = false;
  selectedStudent: AppUser | null = null;
  studentEnrollments: any[] = [];   // { id, course_id, class_id, courseTitle, className, status }
  loadingEnrollments = false;

  // Form de asignación rápida
  enrollCourseId = '';
  enrollClassId = '';
  enrollAvailableClasses: any[] = [];
  enrolling = false;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('app_theme');
    if (saved) this.selectedTheme = saved;
    this.applyTheme(this.selectedTheme);

    const savedFont = localStorage.getItem('app_font');
    if (savedFont) {
      const fontObj = this.availableFonts.find(f => f.id === savedFont);
      if (fontObj) {
        this.selectedFontId = fontObj.id;
        this.loadGoogleFont(fontObj);
        document.documentElement.style.setProperty('--font-family', fontObj.family);
      }
    }
    this.cardCategories = [...new Set(this.permissionCards.map(card => card.category))];

    // Cargar roles personalizados desde Supabase
    this.loadCustomRoles();

    this.loadPermissions();
    this.loadUsers();
    this.loadStudents();
    this.loadCourses();
    this.loadClasses();
    this.loadPlatformPermissions();
    this.loadSchoolConfig();
    this.loadMetrics();
  }

  // ─── CARGAR PERMISOS DESDE SUPABASE ───────────────────────
  async loadPlatformPermissions(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('platform_permissions')
        .select('*')
        .order('category');

      if (error) {
        console.log('Error cargando permisos (tabla puede no existir):', error);
        return;
      }

      this.platformPermissions = (data ?? []) as PlatformPermission[];
    } catch (e) {
      console.log('Error cargando permisos:', e);
    }
  }

  // ─── GUARDAR PERMISO ─────────────────────────────────────
  async savePermission(perm: PlatformPermission): Promise<void> {
    this.loading = true;
    try {
      const { error } = await this.supabase
        .from('platform_permissions')
        .update({
          admin_enabled: perm.admin_enabled,
          teacher_enabled: perm.teacher_enabled,
          tutor_enabled: perm.tutor_enabled,
          student_enabled: perm.student_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', perm.id);

      if (error) throw error;
      this.showSuccess('✅ Permiso actualizado');
    } catch (e: unknown) {
      this.showError('Error guardando permiso: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  // ─── CARGAR CONFIGURACIÓN DE LA ESCUELA ──────────────────
  async loadSchoolConfig(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('school_config')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.log('Error cargando config (tabla puede no existir):', error);
        return;
      }

      this.schoolConfig = data as SchoolConfig;
      this.applySchoolColors();
    } catch (e) {
      console.log('Error cargando config:', e);
    }
  }

  applySchoolColors(): void {
    if (!this.schoolConfig) return;

    document.documentElement.style.setProperty('--color-primary', this.schoolConfig.primary_color);
    document.documentElement.style.setProperty('--color-secondary', this.schoolConfig.secondary_color);
    document.documentElement.style.setProperty('--color-accent', this.schoolConfig.accent_color || '#f093fb');
    document.documentElement.style.setProperty('--color-bg', this.schoolConfig.background_color || '#f0f2ff');
  }

  // ─── ABRIR MODAL ESCUELA ─────────────────────────────────
  openSchoolModal(): void {
    if (this.schoolConfig) {
      this.schoolForm = {
        school_name: this.schoolConfig.school_name,
        school_description: this.schoolConfig.school_description || '',
        school_logo_url: this.schoolConfig.school_logo_url || '',
        school_address: this.schoolConfig.school_address || '',
        school_phone: this.schoolConfig.school_phone || '',
        school_email: this.schoolConfig.school_email || '',
        primary_color: this.schoolConfig.primary_color,
        secondary_color: this.schoolConfig.secondary_color,
        accent_color: this.schoolConfig.accent_color,
        background_color: this.schoolConfig.background_color,
        font_family: localStorage.getItem('app_font') || 'comic'
      };
    } else {
      this.schoolForm = this.emptySchoolForm();
    }
    this.showSchoolModal = true;
  }

  closeSchoolModal(): void {
    this.showSchoolModal = false;
  }

  // ─── GUARDAR CONFIGURACIÓN ESCUELA ───────────────────────
  async saveSchoolConfig(): Promise<void> {
    if (!this.schoolForm.school_name.trim()) {
      this.showError('El nombre de la escuela es requerido');
      return;
    }

    this.loading = true;
    try {
      const payload = {
        school_name: this.schoolForm.school_name,
        school_description: this.schoolForm.school_description,
        school_logo_url: this.schoolForm.school_logo_url,
        school_address: this.schoolForm.school_address,
        school_phone: this.schoolForm.school_phone,
        school_email: this.schoolForm.school_email,
        primary_color: this.schoolForm.primary_color,
        secondary_color: this.schoolForm.secondary_color,
        accent_color: this.schoolForm.accent_color,
        background_color: this.schoolForm.background_color,
        updated_at: new Date().toISOString()
      };

      if (this.schoolConfig) {
        const { error } = await this.supabase
          .from('school_config')
          .update(payload)
          .eq('id', this.schoolConfig.id);

        if (error) throw error;
      } else {
        const { error } = await this.supabase
          .from('school_config')
          .insert([payload]);

        if (error) throw error;
      }

      this.showSuccess('✅ Configuración de escuela guardada');
      this.closeSchoolModal();
      await this.loadSchoolConfig();
    } catch (e: unknown) {
      this.showError('Error guardando: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  // ─── CARGAR MÉTRICAS ─────────────────────────────────────
  async loadMetrics(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('platform_metrics')
        .select('*')
        .order('display_order');

      if (error) {
        console.log('Error cargando métricas (tabla puede no existir):', error);
        return;
      }

      this.platformMetrics = (data ?? []) as PlatformMetric[];
    } catch (e) {
      console.log('Error cargando métricas:', e);
    }
  }

  // ─── ABRIR MODAL MÉTRICA ─────────────────────────────────
  openMetricModal(metric?: PlatformMetric): void {
    if (metric) {
      this.editingMetric = metric;
      this.metricForm = {
        metric_key: metric.metric_key,
        metric_name: metric.metric_name,
        metric_value: metric.metric_value || '',
        metric_type: metric.metric_type,
        is_visible: metric.is_visible,
        display_order: metric.display_order
      };
    } else {
      this.editingMetric = null;
      this.metricForm = this.emptyMetricForm();
    }
    this.showMetricModal = true;
  }

  closeMetricModal(): void {
    this.showMetricModal = false;
    this.editingMetric = null;
  }

  // ─── GUARDAR MÉTRICA ─────────────────────────────────────
  async saveMetric(): Promise<void> {
    if (!this.metricForm.metric_name.trim() || !this.metricForm.metric_key.trim()) {
      this.showError('El nombre y clave de la métrica son requeridos');
      return;
    }

    this.loading = true;
    try {
      const payload = {
        metric_key: this.metricForm.metric_key,
        metric_name: this.metricForm.metric_name,
        metric_value: this.metricForm.metric_value,
        metric_type: this.metricForm.metric_type,
        is_visible: this.metricForm.is_visible,
        display_order: this.metricForm.display_order,
        updated_at: new Date().toISOString()
      };

      if (this.editingMetric) {
        const { error } = await this.supabase
          .from('platform_metrics')
          .update(payload)
          .eq('id', this.editingMetric.id);

        if (error) throw error;
        this.showSuccess('✅ Métrica actualizada');
      } else {
        const { error } = await this.supabase
          .from('platform_metrics')
          .insert([payload]);

        if (error) throw error;
        this.showSuccess('✅ Métrica creada');
      }

      this.closeMetricModal();
      await this.loadMetrics();
    } catch (e: unknown) {
      this.showError('Error guardando: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  // ─── ELIMINAR MÉTRICA ────────────────────────────────────
  async deleteMetric(id: string): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar esta métrica?')) return;

    this.loading = true;
    try {
      const { error } = await this.supabase
        .from('platform_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.showSuccess('✅ Métrica eliminada');
      await this.loadMetrics();
    } catch (e: unknown) {
      this.showError('Error eliminando: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  // ─── SUBIR ARCHIVO ────────────────────────────────────────
  async uploadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingFile = true;

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await this.supabase.storage
        .from('files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = this.supabase.storage
        .from('files')
        .getPublicUrl(fileName);

      this.uploadedFileUrl = urlData.publicUrl;
      this.schoolForm.school_logo_url = this.uploadedFileUrl;
      this.showSuccess('✅ Archivo subido correctamente');
    } catch (e: unknown) {
      this.showError('Error subiendo archivo: ' + this.getErrorMessage(e));
    } finally {
      this.uploadingFile = false;
    }
  }

  // ─── HELPERS DE MÉTRICAS ────────────────────────────────
  getMetricIcon(type: string): string {
    const icons: Record<string, string> = {
      number: 'fas fa-hashtag',
      percentage: 'fas fa-percent',
      text: 'fas fa-font',
      currency: 'fas fa-dollar-sign',
      date: 'fas fa-calendar'
    };
    return icons[type] || 'fas fa-chart-bar';
  }

  async toggleMetricVisibility(metric: PlatformMetric): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('platform_metrics')
        .update({ is_visible: !metric.is_visible, updated_at: new Date().toISOString() })
        .eq('id', metric.id);

      if (error) throw error;
      await this.loadMetrics();
    } catch (e: unknown) {
      this.showError('Error actualizando métrica: ' + this.getErrorMessage(e));
    }
  }

  private get supabase() {
    return this.supabaseService.getClient();
  }

  setSection(section: string): void {
    this.activeSection = section;
    this.clearMessages();
  }

  clearMessages(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }

  showSuccess(message: string): void {
    this.successMsg = message;
    this.errorMsg = '';
    setTimeout(() => {
      this.successMsg = '';
    }, 3500);
  }

  showError(message: string): void {
    this.errorMsg = message;
    this.successMsg = '';
    setTimeout(() => {
      this.errorMsg = '';
    }, 4000);
  }

  emptyUserForm(): UserForm {
    return {
      name: '',
      email: '',
      role: 'student',
      password: ''
    };
  }

  emptySchoolForm(): SchoolForm {
    return {
      school_name: '',
      school_description: '',
      school_logo_url: '',
      school_address: '',
      school_phone: '',
      school_email: '',
      primary_color: '#667eea',
      secondary_color: '#764ba2',
      accent_color: '#f093fb',
      background_color: '#f0f2ff',
      font_family: 'comic'
    };
  }

  emptyMetricForm(): MetricForm {
    return {
      metric_key: '',
      metric_name: '',
      metric_value: '',
      metric_type: 'text',
      is_visible: true,
      display_order: 0
    };
  }

  /**
   * Crea un formulario vacío para un nuevo rol.
   * @returns Objeto RoleForm con valores por defecto.
   */
  emptyRoleForm(): RoleForm {
    return {
      name: '',
      code: '',
      description: '',
      color: '#667eea',
      icon: 'fas fa-user'
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FUNCIONES PARA GESTIÓN DE ROLES Y PERMISOS GRANULARES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Inicializa los roles por defecto del sistema.
   * Estos roles no pueden ser eliminados.
   */
  private initDefaultRoles(): void {
    this.customRoles = [
      {
        id: 'role_admin',
        name: 'Administrador',
        code: 'admin',
        description: 'Acceso completo a todos los módulos del sistema',
        color: '#667eea',
        icon: 'fas fa-crown',
        is_default: true,
        permissions: this.granularPermissions.map(p => ({
          module_key: p.module_key,
          can_view: true,
          can_create: true,
          can_edit: true
        }))
      },
      {
        id: 'role_teacher',
        name: 'Profesor',
        code: 'teacher',
        description: 'Puede gestionar cursos, clases y evaluaciones',
        color: '#f7971e',
        icon: 'fas fa-chalkboard-teacher',
        is_default: true,
        permissions: this.granularPermissions
          .filter(p => ['courses', 'lessons', 'classes', 'quizzes', 'take_quiz', 'practice'].includes(p.module_key))
          .map(p => ({
            module_key: p.module_key,
            can_view: true,
            can_create: p.module_key !== 'take_quiz' && p.module_key !== 'practice',
            can_edit: p.module_key !== 'take_quiz' && p.module_key !== 'practice'
          }))
      },
      {
        id: 'role_tutor',
        name: 'Tutor',
        code: 'tutor',
        description: 'Puede ver informes y progreso de estudiantes',
        color: '#11998e',
        icon: 'fas fa-user-friends',
        is_default: true,
        permissions: this.granularPermissions
          .filter(p => ['courses', 'lessons', 'classes', 'take_quiz', 'practice', 'reports'].includes(p.module_key))
          .map(p => ({
            module_key: p.module_key,
            can_view: true,
            can_create: false,
            can_edit: false
          }))
      },
      {
        id: 'role_student',
        name: 'Estudiante',
        code: 'student',
        description: 'Puede ver contenido y realizar evaluaciones',
        color: '#56ab2f',
        icon: 'fas fa-user-graduate',
        is_default: true,
        permissions: this.granularPermissions
          .filter(p => ['courses', 'lessons', 'take_quiz', 'practice'].includes(p.module_key))
          .map(p => ({
            module_key: p.module_key,
            can_view: true,
            can_create: false,
            can_edit: false
          }))
      }
    ];
  }

  /**
   * Carga los roles desde Supabase (tabla custom_roles + role_module_permissions).
   * Si la tabla no existe todavía, usa los roles por defecto en memoria.
   */
  async loadCustomRoles(): Promise<void> {
    try {
      const { data: rolesData, error: rolesError } = await this.supabase
        .from('custom_roles')
        .select('*')
        .order('is_default', { ascending: false });

      if (rolesError) {
        console.log('Tabla custom_roles no existe aún, usando roles en memoria:', rolesError.message);
        this.initDefaultRoles();
        return;
      }

      const { data: permsData, error: permsError } = await this.supabase
        .from('role_module_permissions')
        .select('*');

      if (permsError) {
        console.log('Error cargando permisos de roles:', permsError.message);
      }

      const permsByRole: Record<string, RolePermission[]> = {};
      for (const p of (permsData ?? [])) {
        if (!permsByRole[p.role_code]) permsByRole[p.role_code] = [];
        permsByRole[p.role_code].push({
          module_key: p.module_key,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit
        });
      }

      this.customRoles = (rolesData ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description ?? '',
        color: r.color ?? '#667eea',
        icon: r.icon ?? 'fas fa-user',
        is_default: r.is_default ?? false,
        permissions: permsByRole[r.code] ?? this.granularPermissions.map(p => ({
          module_key: p.module_key,
          can_view: false,
          can_create: false,
          can_edit: false
        }))
      }));

      if (this.customRoles.length === 0) {
        this.initDefaultRoles();
      }
    } catch (e) {
      console.log('Error inesperado cargando roles:', e);
      this.initDefaultRoles();
    }
  }

  /**
   * @deprecated Roles se guardan directamente en Supabase, este método ya no se usa.
   */
  saveCustomRoles(): void {
    // No-op: roles are persisted in Supabase via saveRole() and toggle methods
  }

  /**
   * Obtiene los permisos de un rol específico.
   * @param roleCode Código del rol.
   * @returns Objeto con permisos o null si no existe.
   */
  getRolePermissions(roleCode: string): RolePermission[] | null {
    const role = this.customRoles.find(r => r.code === roleCode);
    return role ? role.permissions : null;
  }

  /**
   * Verifica si un rol tiene permiso de vista para un módulo.
   * @param roleCode Código del rol.
   * @param moduleKey Clave del módulo.
   * @returns true si tiene permiso de vista.
   */
  canRoleView(roleCode: string, moduleKey: string): boolean {
    const perms = this.getRolePermissions(roleCode);
    if (!perms) return false;
    const modPerm = perms.find(p => p.module_key === moduleKey);
    return modPerm ? modPerm.can_view : false;
  }

  /**
   * Verifica si un rol tiene permiso de creación para un módulo.
   * @param roleCode Código del rol.
   * @param moduleKey Clave del módulo.
   * @returns true si tiene permiso de creación.
   */
  canRoleCreate(roleCode: string, moduleKey: string): boolean {
    const perms = this.getRolePermissions(roleCode);
    if (!perms) return false;
    const modPerm = perms.find(p => p.module_key === moduleKey);
    return modPerm ? modPerm.can_create : false;
  }

  /**
   * Verifica si un rol tiene permiso de edición para un módulo.
   * @param roleCode Código del rol.
   * @param moduleKey Clave del módulo.
   * @returns true si tiene permiso de edición.
   */
  canRoleEdit(roleCode: string, moduleKey: string): boolean {
    const perms = this.getRolePermissions(roleCode);
    if (!perms) return false;
    const modPerm = perms.find(p => p.module_key === moduleKey);
    return modPerm ? modPerm.can_edit : false;
  }

  /**
   * Persiste un permiso de rol en Supabase (upsert).
   */
  private async upsertRolePermission(roleCode: string, moduleKey: string, perm: RolePermission): Promise<void> {
    const { error } = await this.supabase
      .from('role_module_permissions')
      .upsert({
        role_code: roleCode,
        module_key: moduleKey,
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_edit: perm.can_edit,
        updated_at: new Date().toISOString()
      }, { onConflict: 'role_code,module_key' });

    if (error) {
      console.error('Error guardando permiso:', error);
      throw error;
    }
  }

  /**
   * Alterna el permiso de vista para un rol y módulo específicos.
   */
  toggleViewPermission(role: CustomRole, moduleKey: string): void {
    let perm = role.permissions.find(p => p.module_key === moduleKey);
    if (!perm) {
      perm = { module_key: moduleKey, can_view: false, can_create: false, can_edit: false };
      role.permissions.push(perm);
    }
    perm.can_view = !perm.can_view;
    // Si se quita la vista, también quitar crear y editar
    if (!perm.can_view) { perm.can_create = false; perm.can_edit = false; }
    this.upsertRolePermission(role.code, moduleKey, perm)
      .then(() => this.showSuccess(`Permiso de vista actualizado para ${role.name}`))
      .catch(e => this.showError('Error guardando permiso: ' + this.getErrorMessage(e)));
  }

  /**
   * Alterna el permiso de creación para un rol y módulo específicos.
   */
  toggleCreatePermission(role: CustomRole, moduleKey: string): void {
    let perm = role.permissions.find(p => p.module_key === moduleKey);
    if (!perm) {
      perm = { module_key: moduleKey, can_view: false, can_create: false, can_edit: false };
      role.permissions.push(perm);
    }
    perm.can_create = !perm.can_create;
    // Si activa crear, también debe tener vista
    if (perm.can_create) perm.can_view = true;
    this.upsertRolePermission(role.code, moduleKey, perm)
      .then(() => this.showSuccess(`Permiso de creación actualizado para ${role.name}`))
      .catch(e => this.showError('Error guardando permiso: ' + this.getErrorMessage(e)));
  }

  /**
   * Alterna el permiso de edición para un rol y módulo específicos.
   */
  toggleEditPermission(role: CustomRole, moduleKey: string): void {
    let perm = role.permissions.find(p => p.module_key === moduleKey);
    if (!perm) {
      perm = { module_key: moduleKey, can_view: false, can_create: false, can_edit: false };
      role.permissions.push(perm);
    }
    perm.can_edit = !perm.can_edit;
    // Si activa editar, también debe tener vista
    if (perm.can_edit) perm.can_view = true;
    this.upsertRolePermission(role.code, moduleKey, perm)
      .then(() => this.showSuccess(`Permiso de edición actualizado para ${role.name}`))
      .catch(e => this.showError('Error guardando permiso: ' + this.getErrorMessage(e)));
  }

  /**
   * Abre el modal para crear un nuevo rol.
   */
  openCreateRole(): void {
    this.editingRole = null;
    this.roleForm = this.emptyRoleForm();
    this.showRoleModal = true;
  }

  /**
   * Abre el modal para editar un rol existente.
   * @param role Rol a editar.
   */
  openEditRole(role: CustomRole): void {
    this.editingRole = role;
    this.roleForm = {
      name: role.name,
      code: role.code,
      description: role.description,
      color: role.color,
      icon: role.icon
    };
    this.showRoleModal = true;
  }

  /**
   * Cierra el modal de roles.
   */
  closeRoleModal(): void {
    this.showRoleModal = false;
    this.editingRole = null;
    this.roleForm = this.emptyRoleForm();
  }

  /**
   * Guarda un rol (crear nuevo o actualizar existente) en Supabase.
   */
  async saveRole(): Promise<void> {
    if (!this.roleForm.name.trim() || !this.roleForm.code.trim()) {
      this.showError('El nombre y código del rol son requeridos');
      return;
    }

    const normalizedCode = this.roleForm.code.toLowerCase().replace(/\s+/g, '_');

    // Validar código único contra los roles en memoria
    const existingRole = this.customRoles.find(r => r.code === normalizedCode);
    if (existingRole && (!this.editingRole || existingRole.id !== this.editingRole.id)) {
      this.showError('Ya existe un rol con ese código');
      return;
    }

    this.loading = true;
    try {
      if (this.editingRole) {
        // Actualizar en Supabase
        const { error } = await this.supabase
          .from('custom_roles')
          .update({
            name: this.roleForm.name,
            description: this.roleForm.description,
            color: this.roleForm.color,
            icon: this.roleForm.icon,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.editingRole.id);

        if (error) throw error;
        this.showSuccess(`✅ Rol "${this.roleForm.name}" actualizado`);
      } else {
        // Insertar nuevo rol en Supabase
        const { data, error } = await this.supabase
          .from('custom_roles')
          .insert([{
            name: this.roleForm.name,
            code: normalizedCode,
            description: this.roleForm.description,
            color: this.roleForm.color,
            icon: this.roleForm.icon,
            is_default: false
          }])
          .select()
          .single();

        if (error) throw error;

        // Crear filas de permisos (todo en false) para el nuevo rol
        const permRows = this.granularPermissions.map(p => ({
          role_code: normalizedCode,
          module_key: p.module_key,
          can_view: false,
          can_create: false,
          can_edit: false
        }));
        await this.supabase.from('role_module_permissions').insert(permRows);

        this.showSuccess(`✅ Rol "${this.roleForm.name}" creado. Ahora configura sus permisos en la pestaña Módulos.`);
      }

      this.closeRoleModal();
      await this.loadCustomRoles();
    } catch (e: unknown) {
      this.showError('Error guardando rol: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  /**
   * Elimina un rol personalizado (no roles por defecto) de Supabase.
   * @param roleId ID del rol a eliminar.
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = this.customRoles.find(r => r.id === roleId);
    if (!role) return;

    if (role.is_default) {
      this.showError('No puedes eliminar un rol del sistema');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el rol "${role.name}"?`)) {
      return;
    }

    this.loading = true;
    try {
      const { error } = await this.supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      if (this.selectedRole?.id === roleId) {
        this.selectedRole = null;
      }
      this.showSuccess(`✅ Rol "${role.name}" eliminado`);
      await this.loadCustomRoles();
    } catch (e: unknown) {
      this.showError('Error eliminando rol: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  /**
   * Selecciona un rol para ver y editar sus permisos.
   * @param role Rol a seleccionar.
   */
  selectRole(role: CustomRole): void {
    this.selectedRole = role;
  }

  /**
   * Obtiene la lista de módulos filtrados para mostrar.
   * @returns Lista de permisos granulares filtrados.
   */
  get filteredModules(): GranularPermission[] {
    return this.granularPermissions.filter(m => {
      const matchesCategory = this.filterModuleCategory === 'all' || m.category === this.filterModuleCategory;
      const matchesSearch = !this.searchModule ||
        m.module_name.toLowerCase().includes(this.searchModule.toLowerCase()) ||
        m.description.toLowerCase().includes(this.searchModule.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  /**
   * Obtiene el nombre de un módulo a partir de su clave.
   * @param moduleKey Clave del módulo.
   * @returns Nombre del módulo o la clave si no se encuentra.
   */
  // Helper methods for template - Angular doesn't allow arrow functions in bindings
  countViewPermissions(role: CustomRole): number {
    return role.permissions?.filter(p => p.can_view)?.length || 0;
  }

  countCreatePermissions(role: CustomRole): number {
    return role.permissions?.filter(p => p.can_create)?.length || 0;
  }

  countEditPermissions(role: CustomRole): number {
    return role.permissions?.filter(p => p.can_edit)?.length || 0;
  }

  getRolePermissionsCount(role: CustomRole): number {
    return role.permissions?.filter(p => p.can_view)?.length || 0;
  }

  getModuleName(moduleKey: string): string {
    const module = this.granularPermissions.find(m => m.module_key === moduleKey);
    return module ? module.module_name : moduleKey;
  }

  /**
   * Obtiene el color para un rol.
   * @param roleCode Código del rol.
   * @returns Color del rol.
   */
  getRoleColor(roleCode: string): string {
    const role = this.customRoles.find(r => r.code === roleCode);
    return role ? role.color : '#667eea';
  }

  /**
   * Reinicia todos los roles a sus valores por defecto recargando desde Supabase.
   */
  async resetRoles(): Promise<void> {
    if (!confirm('¿Restablecer la vista? Se recargará la información de roles desde la base de datos.')) {
      return;
    }
    this.selectedRole = null;
    await this.loadCustomRoles();
    this.showSuccess('✅ Roles recargados desde la base de datos');
  }

  async loadUsers(): Promise<void> {
    this.loading = true;

    try {
      const { data, error } = await this.supabase
        .from('app_users')
        .select('id,name,email,role,created_at')
        .order('name');

      if (error) {
        throw error;
      }

      this.users = (data ?? []) as AppUser[];
      this.applyUserFilters();
    } catch (e: unknown) {
      this.showError('Error cargando usuarios: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  applyUserFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch =
        !this.searchUser ||
        user.name.toLowerCase().includes(this.searchUser.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchUser.toLowerCase());

      const matchesRole = !this.filterRole || this.normalizeRole(user.role) === this.filterRole;

      return matchesSearch && matchesRole;
    });
  }

  openCreateUser(): void {
    this.editingUser = null;
    this.userForm = this.emptyUserForm();
    this.userFormErrors = {};
    this.showUserModal = true;
  }

  openEditUser(user: AppUser): void {
    this.editingUser = { ...user };
    this.userForm = {
      name: user.name,
      email: user.email,
      role: this.normalizeRole(user.role),
      password: ''
    };
    this.userFormErrors = {};
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
    this.userFormErrors = {};
  }

  validateUserForm(): boolean {
    this.userFormErrors = {};

    if (!this.userForm.name.trim()) {
      this.userFormErrors['name'] = 'El nombre es requerido';
    }

    if (!this.userForm.email.trim()) {
      this.userFormErrors['email'] = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userForm.email)) {
      this.userFormErrors['email'] = 'Email inválido';
    }

    if (!this.editingUser && !this.userForm.password.trim()) {
      this.userFormErrors['password'] = 'La contraseña es requerida';
    }

    if (!this.userForm.role) {
      this.userFormErrors['role'] = 'El rol es requerido';
    }

    return Object.keys(this.userFormErrors).length === 0;
  }

  async saveUser(): Promise<void> {
    if (!this.validateUserForm()) {
      return;
    }

    this.loading = true;

    try {
      const payload = {
        name: this.userForm.name,
        email: this.userForm.email,
        role: this.normalizeRole(this.userForm.role)
      };

      if (this.editingUser) {
        const { error } = await this.supabase
          .from('app_users')
          .update(payload)
          .eq('id', this.editingUser.id);

        if (error) {
          throw error;
        }

        this.showSuccess(`✅ Usuario "${this.userForm.name}" actualizado`);
      } else {
        const { error } = await this.supabase
          .from('app_users')
          .insert([payload]);

        if (error) {
          throw error;
        }

        this.showSuccess(`✅ Usuario "${this.userForm.name}" creado`);
      }

      this.closeUserModal();
      await this.loadUsers();
    } catch (e: unknown) {
      this.showError('Error guardando: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

   confirmDelete(type: string, id: string, name?: string | null): void {
    this.deleteConfirm = {
      type,
      id,
      name: name ?? 'Sin nombre'
    };
  }

  cancelDelete(): void {
    this.deleteConfirm = null;
  }

  async executeDelete(): Promise<void> {
    if (!this.deleteConfirm) {
      return;
    }

    this.loading = true;

    try {
      const table = this.deleteConfirm.type === 'user' ? 'app_users' : 'classes';
      const { error } = await this.supabase.from(table).delete().eq('id', this.deleteConfirm.id);

      if (error) {
        throw error;
      }

      this.showSuccess(`✅ "${this.deleteConfirm.name}" eliminado`);

      if (this.deleteConfirm.type === 'user') {
        await this.loadUsers();
      } else {
        await this.loadClasses();
      }
    } catch (e: unknown) {
      this.showError('Error eliminando: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
      this.deleteConfirm = null;
    }
  }

  getRoleBadgeClass(role: string): string {
    const normalizedRole = this.normalizeRole(role);

    const map: Record<string, string> = {
      admin: 'badge-admin',
      teacher: 'badge-teacher',
      tutor: 'badge-tutor',
      student: 'badge-student'
    };

    return map[normalizedRole] || 'badge-default';
  }

  /**
   * Obtiene el icono para un rol (usa el nuevo sistema de roles personalizados).
   * @param role Código o nombre del rol.
   * @returns Clase CSS del icono.
   */
  getRoleIcon(role: string): string {
    // Primero buscar en customRoles (nuevo sistema)
    const customRole = this.customRoles.find(r => r.code === role);
    if (customRole) {
      return customRole.icon;
    }

    // Fallback al sistema antiguo
    const normalizedRole = this.normalizeRole(role);
    const map: Record<string, string> = {
      admin: 'fas fa-crown',
      teacher: 'fas fa-chalkboard-teacher',
      tutor: 'fas fa-user-tie',
      student: 'fas fa-user-graduate'
    };
    return map[normalizedRole] || 'fas fa-user';
  }

  getUserCountByRole(role: string): number {
    const normalizedRole = this.normalizeRole(role);
    return this.users.filter(user => this.normalizeRole(user.role) === normalizedRole).length;
  }

  emptyClassForm(): ClassForm {
    return {
      name: '',
      course_id: '',
      status: 'open',
      max_students: 30,
      start_date: '',
      end_date: ''
    };
  }

  async loadCourses(): Promise<void> {
    const { data } = await this.supabase
      .from('courses')
      .select('id,title')
      .order('title');

    this.courses = (data ?? []) as CourseOption[];
  }

  async loadClasses(): Promise<void> {
    this.loading = true;

    try {
      const { data, error } = await this.supabase
        .from('classes')
        .select('id,name,title,status,course_id,max_students,enrollment_count,start_date,end_date')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.classes = (data ?? []) as ClassItem[];
      this.applyClassFilters();
    } catch (e: unknown) {
      this.showError('Error cargando clases: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  applyClassFilters(): void {
    this.filteredClasses = this.classes.filter(item => {
      const text = (item.name || item.title || '').toLowerCase();
      return !this.searchClass || text.includes(this.searchClass.toLowerCase());
    });
  }

  openCreateClass(): void {
    this.editingClass = null;
    this.classForm = this.emptyClassForm();
    this.showClassModal = true;
  }

  openEditClass(cls: ClassItem): void {
    this.editingClass = { ...cls };
    this.classForm = {
      name: cls.name || cls.title || '',
      course_id: cls.course_id || '',
      status: cls.status || 'open',
      max_students: cls.max_students || 30,
      start_date: cls.start_date || '',
      end_date: cls.end_date || ''
    };
    this.showClassModal = true;
  }

  closeClassModal(): void {
    this.showClassModal = false;
    this.editingClass = null;
  }

  async saveClass(): Promise<void> {
    if (!this.classForm.name.trim()) {
      this.showError('El nombre es requerido');
      return;
    }

    this.loading = true;

    try {
      const payload = {
        name: this.classForm.name,
        title: this.classForm.name,
        course_id: this.classForm.course_id || null,
        status: this.classForm.status,
        max_students: this.classForm.max_students || 30,
        start_date: this.classForm.start_date || null,
        end_date: this.classForm.end_date || null
      };

      if (this.editingClass) {
        const { error } = await this.supabase
          .from('classes')
          .update(payload)
          .eq('id', this.editingClass.id);

        if (error) {
          throw error;
        }

        this.showSuccess(`✅ Clase "${payload.name}" actualizada`);
      } else {
        const { error } = await this.supabase
          .from('classes')
          .insert([payload]);

        if (error) {
          throw error;
        }

        this.showSuccess(`✅ Clase "${payload.name}" creada`);
      }

      this.closeClassModal();
      await this.loadClasses();
    } catch (e: unknown) {
      this.showError('Error guardando clase: ' + this.getErrorMessage(e));
    } finally {
      this.loading = false;
    }
  }

  

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  // Convierte el error a texto legible
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Error desconocido';
  }

  // Normaliza el rol a minúsculas en inglés
  normalizeRole(role: string): string {
    if (!role) return 'student';
    const normalized = role.toLowerCase();
    if (normalized === 'estudiante') return 'student';
    return normalized;
  }

  // Cuenta usuarios por rol
  getTotalUsers(): number { return this.users.length; }
  getTotalClasses(): number { return this.classes.length; }
  getEnabledCount(): number { return this.permissionCards.filter(c => c.enabled).length; }



  // Etiqueta de estado de clase
  getClassStatusLabel(status: string): string {
    const map: Record<string, string> = {
      open: 'Abierta', closed: 'Cerrada',
      active: 'Activa', inactive: 'Inactiva'
    };
    return map[status] || status;
  }

  // Título del curso por ID
  getCourseTitle(courseId?: string | null): string {
    if (!courseId) return '—';
    return this.courses.find(c => c.id === courseId)?.title || '—';
  }

  // Seleccionar y aplicar tema
  selectTheme(id: string): void {
    this.selectedTheme = id;
    localStorage.setItem('app_theme', id);
    this.applyTheme(id);
    this.showSuccess('✅ Tema aplicado');
  }

  applyTheme(id: string): void {
    const theme = this.themes.find(item => item.id === id);
    if (!theme) return;
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
    document.documentElement.style.setProperty('--color-accent', theme.accent);
    document.documentElement.style.setProperty('--color-bg', theme.bg);
  }

  loadGoogleFont(font: { google: string | null; family: string }): void {
    if (!font.google) return;
    const id = `gfont-${font.google.replace(/[^a-z0-9]/gi, '')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
    document.head.appendChild(link);
  }

  selectFont(fontId: string): void {
    const font = this.availableFonts.find(f => f.id === fontId);
    if (!font) return;
    this.selectedFontId = fontId;
    this.schoolForm.font_family = fontId;
    this.loadGoogleFont(font);
    document.documentElement.style.setProperty('--font-family', font.family);
    localStorage.setItem('app_font', fontId);
  }

  getFontLabel(fontId: string): string {
    return this.availableFonts.find(f => f.id === fontId)?.name || fontId;
  }

  getTheme(id: string): ThemeOption | undefined {
    return this.themes.find(theme => theme.id === id);
  }

  // Permisos de tarjetas
  get filteredCards(): PermissionCard[] {
    return this.permissionCards.filter(card => {
      const matchesCategory = this.filterCardCategory === 'all' || card.category === this.filterCardCategory;
      const matchesRole = this.filterCardRole === 'all' || card.roles.includes(this.filterCardRole);
      return matchesCategory && matchesRole;
    });
  }

  toggleCardEnabled(card: PermissionCard): void {
    card.enabled = !card.enabled;
    this.savePermissions();
    this.showSuccess(card.enabled ? `✅ "${card.title}" activado` : `⚠️ "${card.title}" desactivado`);
  }

  toggleRoleOnCard(card: PermissionCard, role: string): void {
    const normalizedRole = this.normalizeRole(role);
    const index = card.roles.indexOf(normalizedRole);
    if (index >= 0) {
      card.roles.splice(index, 1);
    } else {
      card.roles.push(normalizedRole);
    }
    this.savePermissions();
  }

  hasRole(card: PermissionCard, role: string): boolean {
    return card.roles.includes(this.normalizeRole(role));
  }

  savePermissions(): void {
    localStorage.setItem('app_permissions', JSON.stringify(this.permissionCards));
  }

  loadPermissions(): void {
    const saved = localStorage.getItem('app_permissions');
    if (!saved) return;
    try {
      const savedCards = JSON.parse(saved) as PermissionCard[];
      savedCards.forEach(savedCard => {
        const currentCard = this.permissionCards.find(card => card.id === savedCard.id);
        if (currentCard) {
          currentCard.enabled = savedCard.enabled;
          currentCard.roles = savedCard.roles.map(role => this.normalizeRole(role));
        }
      });
    } catch {
      this.showError('No se pudieron cargar los permisos guardados');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CURSOS ASIGNADOS — métodos
  // ═══════════════════════════════════════════════════════════════

  async loadStudents(): Promise<void> {
    const { data } = await this.supabase
      .from('app_users')
      .select('id,name,email,role,created_at')
      .eq('role', 'student')
      .order('name');
    this.students = (data ?? []) as AppUser[];
    this.applyStudentFilter();
  }

  applyStudentFilter(): void {
    const q = this.searchStudent.toLowerCase().trim();
    this.filteredStudents = q
      ? this.students.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      : [...this.students];
  }

  // Abre el modal sincrónicamente y carga datos en segundo plano
  openEnrollmentModal(student: AppUser): void {
    this.selectedStudent = student;
    this.studentEnrollments = [];
    this.enrollCourseId = '';
    this.enrollClassId = '';
    this.enrollAvailableClasses = [];
    this.loadingEnrollments = true;
    this.showEnrollmentModal = true;   // Sincrónico → Angular detecta el cambio
    this.fetchStudentEnrollments(student);
  }

  private async fetchStudentEnrollments(student: AppUser): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('class_enrollments')
        .select('id, course_id, class_id, status')
        .eq('student_id', student.id);

      const rows = data ?? [];
      this.studentEnrollments = rows.map((r: any) => ({
        ...r,
        courseTitle: this.courses.find(c => c.id === r.course_id)?.title ?? r.course_id,
        className:   this.classes.find(c => c.id === r.class_id)?.name
                  ?? this.classes.find(c => c.id === r.class_id)?.title
                  ?? r.class_id,
      }));
    } finally {
      this.loadingEnrollments = false;
    }
  }

  closeEnrollmentModal(): void {
    this.selectedStudent = null;
    this.studentEnrollments = [];
    this.enrollCourseId = '';
    this.enrollClassId = '';
    this.enrollAvailableClasses = [];
  }

  onEnrollCourseChange(): void {
    this.enrollClassId = '';
    this.enrollAvailableClasses = this.classes.filter(c => c.course_id === this.enrollCourseId);
  }

  async assignCourseToStudent(): Promise<void> {
    if (!this.selectedStudent || !this.enrollCourseId || !this.enrollClassId) return;
    this.enrolling = true;
    try {
      const { error } = await this.supabase
        .from('class_enrollments')
        .upsert({
          student_id: this.selectedStudent.id,
          course_id:  this.enrollCourseId,
          class_id:   this.enrollClassId,
          status:     'active'
        }, { onConflict: 'student_id,class_id' });

      if (error) throw error;
      this.showSuccess('✅ Curso asignado correctamente');
      if (this.selectedStudent) this.openEnrollmentModal(this.selectedStudent);
    } catch (e) {
      this.showError('Error asignando curso: ' + this.getErrorMessage(e));
    } finally {
      this.enrolling = false;
    }
  }

  async removeEnrollment(enrollment: any): Promise<void> {
    if (!confirm('¿Quitar este curso asignado al alumno?')) return;
    try {
      await this.supabase.from('class_enrollments').delete().eq('id', enrollment.id);
      this.showSuccess('✅ Asignación eliminada');
      if (this.selectedStudent) if (this.selectedStudent) this.openEnrollmentModal(this.selectedStudent);
    } catch (e) {
      this.showError('Error eliminando: ' + this.getErrorMessage(e));
    }
  }

  getEnrollmentCount(studentId: string): number {
    // Cuenta aproximada desde class_enrollments si ya están cargados (para badge)
    return 0; // Se carga al abrir el modal
  }

  resetPermissions(): void {
    if (confirm('¿Restablecer todos los permisos a valores predeterminados?')) {
      this.permissionCards = [
        { id: 'card_courses', title: 'Ver Cursos', description: 'Acceso a la lista de cursos disponibles', icon: 'fas fa-book-open', color: '#667eea', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Contenido' },
        { id: 'card_classes', title: 'Gestión de Clases', description: 'Crear, editar y eliminar clases', icon: 'fas fa-chalkboard-teacher', color: '#f7971e', roles: ['admin', 'teacher'], enabled: true, category: 'Gestión' },
        { id: 'card_quiz', title: 'Quizzes', description: 'Crear y gestionar evaluaciones', icon: 'fas fa-brain', color: '#11998e', roles: ['admin', 'teacher'], enabled: true, category: 'Evaluación' },
        { id: 'card_takequiz', title: 'Tomar Quiz', description: 'Resolver evaluaciones y quizzes', icon: 'fas fa-pencil-alt', color: '#ff758c', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Evaluación' },
        { id: 'card_reports', title: 'Informes', description: 'Ver reportes y estadísticas de alumnos', icon: 'fas fa-chart-bar', color: '#4ca1af', roles: ['admin', 'tutor'], enabled: true, category: 'Informes' },
        { id: 'card_users', title: 'Gestión Usuarios', description: 'Administrar cuentas de usuarios', icon: 'fas fa-users-cog', color: '#764ba2', roles: ['admin'], enabled: true, category: 'Administración' },
        { id: 'card_settings', title: 'Parámetros', description: 'Configurar parámetros del sistema', icon: 'fas fa-sliders-h', color: '#2c3e50', roles: ['admin'], enabled: true, category: 'Administración' },
        { id: 'card_lessons', title: 'Lecciones', description: 'Ver y completar lecciones asignadas', icon: 'fas fa-graduation-cap', color: '#56ab2f', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Contenido' },
        { id: 'card_review', title: 'Practicar', description: 'Área de práctica y ejercicios', icon: 'fas fa-star', color: '#ffd200', roles: ['admin', 'teacher', 'tutor', 'student'], enabled: true, category: 'Contenido' }
      ];
      this.showSuccess('✅ Permisos restablecidos');
    }
  }
}