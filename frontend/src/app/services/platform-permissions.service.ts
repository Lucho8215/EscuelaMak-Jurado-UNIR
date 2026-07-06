import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { PlatformPermission, ModuleRole, MenuModule } from '../models/platform-permission.model';

/**
 * Definición de los 8 módulos principales del menú
 */
const MENU_MODULES: MenuModule[] = [
  {
    key: 'menu_dashboard',
    name: 'Dashboard',
    icon: 'fas fa-house',
    route: '/dashboard',
    description: 'Panel principal de control'
  },
  {
    key: 'menu_courses',
    name: 'Cursos',
    icon: 'fas fa-book-open',
    route: '/courses',
    description: 'Ver y acceder a cursos'
  },
  {
    key: 'menu_review',
    name: 'Revisión',
    icon: 'fas fa-star',
    route: '/review',
    description: 'Revisión académica y ejercicios'
  },
  {
    key: 'menu_user_management',
    name: 'Gestión de Usuarios',
    icon: 'fas fa-users-cog',
    route: '/user-management',
    description: 'Administrar usuarios del sistema'
  },
  {
    key: 'menu_course_management',
    name: 'Gestión de Cursos',
    icon: 'fas fa-chalkboard-teacher',
    route: '/course-management',
    description: 'Crear y administrar cursos'
  },
  {
    key: 'menu_quiz_management',
    name: 'Gestión de Quizzes',
    icon: 'fas fa-circle-question',
    route: '/quiz-management',
    description: 'Crear y gestionar evaluaciones'
  },
  {
    key: 'menu_gradient_generator',
    name: 'Generador de Gradientes',
    icon: 'fas fa-palette',
    route: '/gradient-generator',
    description: 'Herramienta de generación de gradientes'
  },
  {
    key: 'menu_parameters',
    name: 'Parámetros',
    icon: 'fas fa-sliders-h',
    route: '/parameters',
    description: 'Configuración del sistema'
  },
  {
    key: 'menu_permissions',
    name: 'Permisos de Módulos',
    icon: 'fas fa-shield-alt',
    route: '/module-permissions',
    description: 'Gestionar permisos de acceso'
  }
];

@Injectable({
  providedIn: 'root'
})
export class PlatformPermissionsService {
  private permissionsSubject = new BehaviorSubject<PlatformPermission[]>([]);
  permissions$ = this.permissionsSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.loadPermissions();
  }

  /**
   * Carga los permisos desde Supabase
   */
  async loadPermissions(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('platform_permissions')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      if (data) {
        this.permissionsSubject.next(data);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }

  /**
   * Obtiene todos los permisos disponibles
   */
  getPermissions(): PlatformPermission[] {
    return this.permissionsSubject.value;
  }

  /**
   * Obtiene los módulos del menú
   */
  getMenuModules(): MenuModule[] {
    return MENU_MODULES;
  }

  /**
   * Obtiene un módulo específico por su key
   */
  getModuleByKey(key: string): MenuModule | undefined {
    return MENU_MODULES.find(m => m.key === key);
  }

  /**
   * Verifica si un módulo está habilitado para un rol específico
   */
  isModuleEnabled(key: string, role: ModuleRole): boolean {
    const permissions = this.permissionsSubject.value;
    const permission = permissions.find(p => p.key === key);

    if (!permission) return true; // Por defecto habilitado si no existe

    switch (role) {
      case 'admin':
        return permission.admin_enabled;
      case 'teacher':
        return permission.teacher_enabled;
      case 'tutor':
        return permission.tutor_enabled;
      case 'student':
        return permission.student_enabled;
      default:
        return false;
    }
  }

  /**
   * Obtiene los módulos habilitados para un rol específico
   */
  getEnabledModules(role: ModuleRole): MenuModule[] {
    return MENU_MODULES.filter(m => this.isModuleEnabled(m.key, role));
  }

  /**
   * Actualiza el estado de un módulo para un rol específico
   */
  async toggleModulePermission(
    permissionKey: string,
    role: ModuleRole,
    enabled: boolean
  ): Promise<boolean> {
    try {
      const fieldMap: Record<ModuleRole, string> = {
        admin: 'admin_enabled',
        teacher: 'teacher_enabled',
        tutor: 'tutor_enabled',
        student: 'student_enabled'
      };

      const field = fieldMap[role];

      console.log(`Actualizando permiso: key="${permissionKey}", campo: ${field}, valor: ${enabled}`);

      // Primero verificamos que el registro existe
      const { data: existingData, error: checkError } = await this.supabaseService
        .getClient()
        .from('platform_permissions')
        .select('id, key')
        .eq('key', permissionKey);

      if (checkError) {
        console.error('Error al verificar registro:', checkError);
        throw checkError;
      }

      console.log('Registros encontrados:', existingData);

      if (!existingData || existingData.length === 0) {
        console.error('No se encontró el módulo con key:', permissionKey);
        this.errorMessage = `No se encontró el módulo "${permissionKey}" en la base de datos`;
        return false;
      }

      const { data, error } = await this.supabaseService
        .getClient()
        .from('platform_permissions')
        .update({ 
          [field]: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('key', permissionKey)
        .select();

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      console.log('Actualización exitosa, datos:', data);

      // Recargar permisos
      await this.loadPermissions();
      return true;
    } catch (error) {
      console.error('Error toggling permission:', error);
      return false;
    }
  }

  private errorMessage: string = '';

  getErrorMessage(): string {
    return this.errorMessage;
  }

  /**
   * Obtiene el estado actual de un módulo para todos los roles
   */
  getModuleStatus(permissionKey: string): {
    admin: boolean;
    teacher: boolean;
    tutor: boolean;
    student: boolean;
  } {
    const permissions = this.permissionsSubject.value;
    const permission = permissions.find(p => p.key === permissionKey);

    if (!permission) {
      return { admin: true, teacher: true, tutor: true, student: true };
    }

    return {
      admin: permission.admin_enabled,
      teacher: permission.teacher_enabled,
      tutor: permission.tutor_enabled,
      student: permission.student_enabled
    };
  }

  /**
   * Obtiene el label legible para un rol
   */
  getRoleLabel(role: ModuleRole): string {
    const labels: Record<ModuleRole, string> = {
      admin: 'Administrador',
      teacher: 'Profesor',
      tutor: 'Tutor',
      student: 'Estudiante'
    };
    return labels[role];
  }

  /**
   * Obtiene el icono y color para cada rol
   */
  getRoleStyle(role: ModuleRole): { icon: string; color: string } {
    const styles: Record<ModuleRole, { icon: string; color: string }> = {
      admin: { icon: 'fas fa-crown', color: '#f59e0b' },
      teacher: { icon: 'fas fa-chalkboard-teacher', color: '#3b82f6' },
      tutor: { icon: 'fas fa-user-graduate', color: '#10b981' },
      student: { icon: 'fas fa-user', color: '#8b5cf6' }
    };
    return styles[role];
  }
}
