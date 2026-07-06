// ============================================================
// SERVICIO DE ROLES - Gestiona los roles de usuario y sus permisos
// ============================================================

// Importa el decorador Injectable de Angular
import { Injectable } from '@angular/core';

// Importa herramientas de RxJS para devolver valores como observables
import { Observable, of } from 'rxjs';

// Importa el modelo de Role y los permisos disponibles
import { Role, AVAILABLE_PERMISSIONS } from '../models/role.model';

// ============================================================
// Decorador que hace este servicio disponible en toda la aplicación
// ============================================================
@Injectable({
  providedIn: 'root'
})

// ============================================================
// Clase que gestiona los roles de usuario
// Define qué puede hacer cada tipo de usuario en la plataforma
// ============================================================
export class RoleService {
  // ============================================================
  // Lista de roles predefinidos del sistema
  // En una app más grande, esto vendría de la base de datos
  // ============================================================
  private roles: Role[] = [
    // Rol de Administrador: Control total del sistema
    {
      id: '1',
      name: 'Administrador',
      description: 'Control total del sistema',
      permissions: ['manage_users', 'review_exercises', 'view_courses', 'manage_permissions']
    },
    // Rol de Profesor: Gestión de cursos y estudiantes
    {
      id: '2',
      name: 'Profesor',
      description: 'Gestión de cursos y estudiantes',
      permissions: ['view_courses', 'review_exercises']
    },
    // Rol de Tutor: Revisión de ejercicios asignados
    {
      id: '3',
      name: 'Tutor',
      description: 'Revisión de ejercicios',
      permissions: ['review_exercises', 'view_courses']
    },
    // Rol de Estudiante: Acceso básico a cursos
    {
      id: '4',
      name: 'Estudiante',
      description: 'Acceso a cursos y ejercicios',
      permissions: ['view_courses']
    }
  ];

  // ============================================================
  // Devuelve la lista de todos los roles disponibles
  // Los componentes pueden suscribirse a este método
  // ============================================================
  getRoles(): Observable<Role[]> {
    return of(this.roles);
  }

  // ============================================================
  // Actualiza los permisos de un rol específico
  // Se usa en la gestión de permisos para modificar lo que puede hacer cada rol
  // ============================================================
  updateRolePermissions(roleId: string, permissions: string[]): Observable<Role> {
    // Busca el rol por su ID
    const role = this.roles.find(r => r.id === roleId);
    
    // Si existe, actualiza sus permisos
    if (role) {
      role.permissions = permissions;
    }
    
    // Devuelve el rol actualizado
    return of(role!);
  }

  // ============================================================
  // Devuelve todos los permisos disponibles en el sistema
  // Se usa para mostrar las opciones en la interfaz de gestión de permisos
  // ============================================================
  getAvailablePermissions() {
    return of(AVAILABLE_PERMISSIONS);
  }
}