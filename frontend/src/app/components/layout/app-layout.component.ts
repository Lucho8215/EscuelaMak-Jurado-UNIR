import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PlatformPermissionsService } from '../../services/platform-permissions.service';
import { SupabaseService } from '../../services/supabase.service';
import { User, UserRole } from '../../models/user.model';
import { Subscription, BehaviorSubject } from 'rxjs';

/**
 * Tipo para definir cada opción del menú lateral.
 * Así evitamos usar objetos "sueltos" sin estructura.
 */
type NavItem = {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
  moduleKey: string;
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.css']
})
export class AppLayoutComponent implements OnInit {
  /**
   * Usuario autenticado actual.
   * Lo obtenemos desde AuthService.
   */
  currentUser: User | null = null;

  /**
   * Contador de mensajes no leídos para la campana de notificaciones.
   */
  unreadCount = 0;
  private currentAuthId = '';  // Fijado una vez en syncAuthUserId, nunca desde getUser()

  /**
   * Intervalo de polling para actualizar el contador de mensajes no leídos.
   */
  private pollInterval: any;

  /**
   * Subscription para los permisos de plataforma
   */
  private permissionsSubscription: Subscription | null = null;

  /**
   * BehaviorSubject para forzar actualización del menú
   */
  private menuRefresh$ = new BehaviorSubject<number>(0);

  /**
   * Contador para forzar actualización del menú
   */
  menuRefreshCount = 0;

  /**
   * Lista de opciones del menú lateral.
   * Cada opción tiene:
   * - texto
   * - ruta
   * - icono
   * - roles permitidos
   */
  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'fas fa-house',
      roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR, UserRole.STUDENT],
      moduleKey: 'menu_dashboard'
    },
    {
      label: 'Cursos',
      route: '/courses',
      icon: 'fas fa-book-open',
      roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR, UserRole.STUDENT],
      moduleKey: 'menu_courses'
    },
    {
      label: 'Revisión',
      route: '/review',
      icon: 'fas fa-star',
      roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR],
      moduleKey: 'menu_review'
    },
    {
      label: 'Gestión de Usuarios',
      route: '/user-management',
      icon: 'fas fa-users-cog',
      roles: [UserRole.ADMIN],
      moduleKey: 'menu_user_management'
    },
    {
      label: 'Gestión de Cursos',
      route: '/course-management',
      icon: 'fas fa-chalkboard-teacher',
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      moduleKey: 'menu_course_management'
    },
    {
      label: 'Gestión de Quizzes',
      route: '/quiz-management',
      icon: 'fas fa-circle-question',
      roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR],
      moduleKey: 'menu_quiz_management'
    },
    {
      label: 'Generador de Gradientes',
      route: '/gradient-generator',
      icon: 'fas fa-palette',
      roles: [UserRole.ADMIN, UserRole.TEACHER],
      moduleKey: 'menu_gradient_generator'
    },
    {
      label: 'Parámetros',
      route: '/parameters',
      icon: 'fas fa-sliders-h',
      roles: [UserRole.ADMIN],
      moduleKey: 'menu_parameters'
    },
    {
      label: 'Permisos de Módulos',
      route: '/module-permissions',
      icon: 'fas fa-shield-alt',
      roles: [UserRole.ADMIN],
      moduleKey: 'menu_permissions'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private permissionsService: PlatformPermissionsService,
    private supabaseService: SupabaseService
  ) {}

  /**
   * Al iniciar el componente:
   * 1. cargamos el usuario actual
   * 2. si no existe, lo mandamos a login
   * 3. suscribimos a cambios en permisos para actualizar el menú
   * 4. cargamos el contador de mensajes no leídos y lo actualizamos cada 30s
   */
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Suscribirse a cambios en los permisos para actualizar el menú dinámicamente
    this.permissionsSubscription = this.permissionsService.permissions$.subscribe(() => {
      this.menuRefreshCount = this.menuRefresh$.value + 1;
      this.menuRefresh$.next(this.menuRefreshCount);
    });

    // Sincronizar auth_user_id por si tiene sesión guardada (sin re-login)
    this.syncAuthUserId();

    // Cargar contador de mensajes no leídos y configurar polling cada 30s
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 30000);
  }

  /**
   * Limpiar suscripciones e intervalos al destruir el componente
   */
  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
    clearInterval(this.pollInterval);
  }

  /**
   * Consulta la base de datos para obtener el conteo de mensajes no leídos.
   * - Admin/teacher/tutor: mensajes enviados a todos (recipient_id IS NULL) que no sean del propio usuario
   * - Estudiantes: mensajes dirigidos a ellos que no han sido leídos
   */
  private async syncAuthUserId(): Promise<void> {
    if (!this.currentUser) return;
    const supabase = this.supabaseService.getClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.id) {
      // Guardar una sola vez — nunca volver a llamar getUser() desde otros métodos
      this.currentAuthId = authUser.id;
      await supabase.from('app_users')
        .update({ auth_user_id: authUser.id })
        .eq('id', this.currentUser.id);
    }
  }

  async loadUnreadCount(): Promise<void> {
    if (!this.currentUser || !this.currentAuthId) return;

    const supabase = this.supabaseService.getClient();
    const authId = this.currentAuthId;  // Usar el valor fijado al iniciar, nunca getUser()

    // Contar mensajes no leídos recibidos (receiver_id = mi auth ID)
    const { count: c1 } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', authId)
      .eq('is_read', false);

    // También via conversations (por si receiver_id varía)
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [authId]);
    let c2 = 0;
    if (convs && convs.length > 0) {
      const convIds = convs.map((c: any) => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', authId)
        .eq('is_read', false);
      c2 = count ?? 0;
    }

    this.unreadCount = Math.max(c1 ?? 0, c2);
  }

  /**
   * Navega a la sección de mensajes según el rol del usuario.
   * - Admin/teacher/tutor: /review con fragmento mensajes
   * - Estudiantes: /courses con fragmento mensajes
   */
  goToMessages(): void {
    if (!this.currentUser) return;

    const isStaff = this.currentUser.role === UserRole.ADMIN ||
                    this.currentUser.role === UserRole.TEACHER ||
                    this.currentUser.role === UserRole.TUTOR;

    const route = isStaff ? '/review' : '/courses';

    if (this.router.url.startsWith(route)) {
      // Ya estamos en la página — disparar evento directo
      window.dispatchEvent(new CustomEvent('escuelamak:open-mensajes'));
    } else {
      // Navegar a la página y señalizar para abrir el modal al llegar
      localStorage.setItem('open_modal', 'mensajes');
      this.router.navigate([route]);
    }
  }

  /**
   * Devuelve solo los ítems del menú que el usuario actual puede ver.
   * Verifica tanto el rol del usuario como los permisos de plataforma.
   */
  get visibleNavItems(): NavItem[] {
    // Depender del observable para actualizar cuando cambien los permisos
    this.menuRefresh$.value;

    if (!this.currentUser) {
      return [];
    }

    const role = this.currentUser.role as 'admin' | 'teacher' | 'tutor' | 'student';
    const userRole = this.currentUser.role;

    return this.navItems.filter(item => {
      // Primero verificar si el rol del usuario está en la lista de roles permitidos
      const hasRoleAccess = item.roles.includes(userRole);

      // Luego verificar si el módulo está habilitado para ese rol
      const isModuleEnabled = this.permissionsService.isModuleEnabled(item.moduleKey, role);

      // El usuario debe tener ambas condiciones
      return hasRoleAccess && isModuleEnabled;
    });
  }

  /**
   * Traduce el rol a un texto amigable para mostrarlo en pantalla.
   */
  get roleLabel(): string {
    switch (this.currentUser?.role) {
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.TEACHER:
        return 'Profesor';
      case UserRole.TUTOR:
        return 'Tutor';
      case UserRole.STUDENT:
        return 'Estudiante';
      default:
        return 'Usuario';
    }
  }

  /**
   * Cierra sesión y regresa al login.
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
