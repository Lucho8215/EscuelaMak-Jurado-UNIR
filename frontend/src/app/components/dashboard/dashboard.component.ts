import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PlatformPermissionsService } from '../../services/platform-permissions.service';
import { User, UserRole } from '../../models/user.model';
import { ModuleRole } from '../../models/platform-permission.model';
import { Subscription } from 'rxjs';

/**
 * Configuración visual y descriptiva por rol.
 * Aquí centralizamos:
 * - etiqueta amigable
 * - icono
 * - clase CSS
 * - descripción principal del dashboard
 */
type RoleConfig = {
  label: string;
  icon: string;
  className: string;
  description: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  /**
   * Usuario autenticado actual.
   */
  currentUser: User | null = null;

  /**
   * Subscription para los permisos de plataforma
   */
  private permissionsSubscription: Subscription | null = null;

  /**
   * Contador para forzar actualización
   */
  private refreshCount = 0;

  /**
   * Configuración central por rol.
   * Esto evita repetir lógica en distintos métodos.
   */
  private readonly roleConfig: Record<UserRole, RoleConfig> = {
    [UserRole.ADMIN]: {
      label: 'Administrador',
      icon: 'fa-crown',
      className: 'admin',
      description: 'Administra usuarios, cursos, quizzes y la configuración general de la plataforma.'
    },
    [UserRole.TEACHER]: {
      label: 'Profesor',
      icon: 'fa-chalkboard-teacher',
      className: 'teacher',
      description: 'Gestiona cursos, clases y cuestionarios para acompañar el aprendizaje.'
    },
    [UserRole.TUTOR]: {
      label: 'Tutor',
      icon: 'fa-user-tie',
      className: 'tutor',
      description: 'Revisa actividades, apoya el seguimiento y participa en la gestión de quizzes.'
    },
    [UserRole.STUDENT]: {
      label: 'Estudiante',
      icon: 'fa-graduation-cap',
      className: 'student',
      description: 'Accede a tus cursos, realiza actividades y continúa tu aprendizaje.'
    }
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private permissionsService: PlatformPermissionsService
  ) {}

  /**
   * Al iniciar el componente:
   * 1. obtenemos el usuario actual
   * 2. si no existe, volvemos al login
   * 3. suscribimos a cambios en permisos
   */
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Suscribirse a cambios en los permisos para actualizar las tarjetas
    this.permissionsSubscription = this.permissionsService.permissions$.subscribe(() => {
      this.refreshCount++;
    });
  }

  /**
   * Limpiar suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  /**
   * Etiqueta legible del rol.
   */
  get roleLabel(): string {
    if (!this.currentUser) {
      return 'Usuario';
    }

    return this.roleConfig[this.currentUser.role]?.label ?? 'Usuario';
  }

  /**
   * Icono asociado al rol.
   */
  get roleIcon(): string {
    if (!this.currentUser) {
      return 'fa-user';
    }

    return this.roleConfig[this.currentUser.role]?.icon ?? 'fa-user';
  }

  /**
   * Clase CSS asociada al rol.
   */
  get roleClass(): string {
    if (!this.currentUser) {
      return 'student';
    }

    return this.roleConfig[this.currentUser.role]?.className ?? 'student';
  }

  /**
   * Descripción principal del dashboard según rol.
   */
  get roleDescription(): string {
    if (!this.currentUser) {
      return 'Bienvenido a la plataforma.';
    }

    return this.roleConfig[this.currentUser.role]?.description ?? 'Bienvenido a la plataforma.';
  }

  /**
   * Título secundario del panel.
   */
  get dashboardTitle(): string {
    return 'Accesos disponibles';
  }

  /**
   * Solo el admin puede gestionar usuarios.
   */
  canManageUsers(): boolean {
    this.refreshCount; // Depender del refresh para actualizar
    if (!this.currentUser) return false;
    return this.currentUser.role === UserRole.ADMIN && 
           this.permissionsService.isModuleEnabled('menu_user_management', this.currentUser.role as ModuleRole);
  }

  /**
   * Ver cursos.
   */
  canViewCourses(): boolean {
    this.refreshCount; // Depender del refresh para actualizar
    if (!this.currentUser) return false;
    return this.permissionsService.isModuleEnabled('menu_courses', this.currentUser.role as ModuleRole);
  }

  /**
   * Revisar ejercicios.
   */
  canReviewExercises(): boolean {
    this.refreshCount; // Depender del refresh para actualizar
    if (!this.currentUser) return false;
    return this.permissionsService.isModuleEnabled('menu_review', this.currentUser.role as ModuleRole);
  }

  /**
   * Gestionar quizzes.
   */
  canManageQuizzes(): boolean {
    this.refreshCount; // Depender del refresh para actualizar
    if (!this.currentUser) return false;
    return this.permissionsService.isModuleEnabled('menu_quiz_management', this.currentUser.role as ModuleRole);
  }

  /**
   * Gestionar cursos.
   */
  canManageCourses(): boolean {
    this.refreshCount; // Depender del refresh para actualizar
    if (!this.currentUser) return false;
    return this.permissionsService.isModuleEnabled('menu_course_management', this.currentUser.role as ModuleRole);
  }

  /**
   * Entrar a parámetros.
   */
  canManageParameters(): boolean {
    this.refreshCount; // Depender del refresh para actualizar
    if (!this.currentUser) return false;
    return this.currentUser.role === UserRole.ADMIN && 
           this.permissionsService.isModuleEnabled('menu_parameters', this.currentUser.role as ModuleRole);
  }
}