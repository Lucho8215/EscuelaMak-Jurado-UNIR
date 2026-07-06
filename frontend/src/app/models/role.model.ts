export interface Permission {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: '1',
    name: 'Gestión de Usuarios',
    description: 'Permite administrar usuarios del sistema',
    code: 'manage_users'
  },
  {
    id: '2',
    name: 'Revisión de Ejercicios',
    description: 'Permite revisar y evaluar ejercicios',
    code: 'review_exercises'
  },
  {
    id: '3',
    name: 'Acceso a Cursos',
    description: 'Permite ver y acceder a los cursos',
    code: 'view_courses'
  },
  {
    id: '4',
    name: 'Gestión de Permisos',
    description: 'Permite administrar roles y permisos',
    code: 'manage_permissions'
  }
];