export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  TUTOR = 'tutor',
  STUDENT = 'student'
}

export interface User {
  id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  cedula: string;
  role: UserRole;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  cedula: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserRequest {
  id: string;
  name: string;
  email: string;
  cedula: string;
  role: UserRole;
}

export interface UpdateUserPasswordRequest {
  userId: string;
  password: string;
}