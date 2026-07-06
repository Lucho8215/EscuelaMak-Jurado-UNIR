/**
 * Modelo de permiso de plataforma
 * Representa cada módulo/permiso que puede ser habilitado o deshabilitado
 */
export interface PlatformPermission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  admin_enabled: boolean;
  teacher_enabled: boolean;
  tutor_enabled: boolean;
  student_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tipos de roles de usuario disponibles en el sistema
 */
export type ModuleRole = 'admin' | 'teacher' | 'tutor' | 'student';

/**
 * Interfaz para actualizar el estado de un módulo para un rol específico
 */
export interface ModuleToggleRequest {
  role: ModuleRole;
  enabled: boolean;
}

/**
 * Definición de los 8 módulos principales del menú
 */
export interface MenuModule {
  key: string;
  name: string;
  icon: string;
  route: string;
  description: string;
}
