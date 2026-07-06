// ============================================================
// SERVICIO DE USUARIOS - Gestiona operaciones CRUD de usuarios
// ============================================================

// Importa el decorador Injectable de Angular
import { Injectable } from '@angular/core';

// Importa herramientas de RxJS
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Importa los modelos de usuario
import {
  User,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest
} from '../models/user.model';

// Importa el servicio de Supabase para conectar con la base de datos
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

// ============================================================
// Tipo que representa una fila de la tabla app_users en Supabase
// Usamos tipos locales para evitar dependencia directa con la estructura de la BD
// ============================================================
type AppUserRow = {
  id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  cedula: string;
  role: string;
};

// Tipo de respuesta de la función administrativa para crear usuario
type AdminFunctionCreateResponse = {
  user: AppUserRow;
};

// Tipo de respuesta de la función administrativa para actualizar usuario
type AdminFunctionUpdateResponse = {
  user: AppUserRow;
};

// Tipo de respuesta de la función administrativa para cambiar contraseña
type AdminFunctionPasswordResponse = {
  success: boolean;
};

// ============================================================
// Decorador que hace este servicio disponible en toda la aplicación
// ============================================================
@Injectable({
  providedIn: 'root'
})

// ============================================================
// Clase que maneja todas las operaciones de usuarios
// CRUD: Crear, Leer, Actualizar, Eliminar usuarios
// Usa funciones serverless de Supabase para operaciones sensibles
// ============================================================
export class UserService {
  // ============================================================
  // Constructor: recibe el servicio de Supabase por inyección de dependencias
  // ============================================================
  constructor(private supabaseService: SupabaseService) {}

  // ============================================================
  // Método privado que construye la URL para llamar funciones de Supabase
  // Las funciones serverless están en: https://[proyecto].supabase.co/functions/v1/[nombre]
  // ============================================================
  private getFunctionEndpoint(name: string): string {
    return `${this.supabaseService.getUrl()}/functions/v1/${name}`;
  }

  // ============================================================
  // Busca un usuario por su email en la tabla app_users
  // Devuelve el usuario o null si no existe
  // Este método se usa principalmente en el login
  // ============================================================
  async getUserByEmail(email: string): Promise<User | null> {
    // Consulta a Supabase: busca en tabla app_users donde email sea igual
    const { data, error } = await this.supabaseService
      .getClient()
      .from('app_users')
      .select('*')                    // Selecciona todas las columnas
      .eq('email', email)            // Filtro: email igual al parámetro
      .single();                      // Espera un solo resultado

    // Si hay error o no hay datos, devuelve null
    if (error || !data) {
      return null;
    }

    // Convierte los datos de la BD a nuestro modelo de usuario
    return this.mapToUser(data as AppUserRow);
  }

  // ============================================================
  // Obtiene todos los usuarios de la plataforma
  // Devuelve un Observable con la lista de usuarios
  // ============================================================
  getUsers(): Observable<User[]> {
    return from(
      // Consulta: selecciona todos los usuarios ordenados por nombre
      this.supabaseService
        .getClient()
        .from('app_users')
        .select('*')
        .order('name')              // Ordena alfabéticamente por nombre
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        // Convierte cada fila al modelo de usuario
        const rows = (data ?? []) as AppUserRow[];
        return rows.map((row: AppUserRow) => this.mapToUser(row));
      }),
      catchError(error =>
        throwError(() => new Error(error.message || 'Error al obtener usuarios'))
      )
    );
  }

  // ============================================================
  // Crea un nuevo usuario en el sistema
  // Usa la función serverless 'admin-users' para crear el usuario en Auth y en la BD
  // ============================================================
  createUser(user: CreateUserRequest): Observable<User> {
    return from(
      this.callAdminFunction<AdminFunctionCreateResponse>('create-user', {
        name: user.name,           // Nombre completo
        email: user.email,         // Correo electrónico
        cedula: user.cedula,       // Número de identificación
        role: user.role,           // Rol del usuario
        password: user.password     // Contraseña inicial
      })
    ).pipe(
      // Convierte la respuesta al modelo User
      map(response => this.mapToUser(response.user)),
      catchError(error =>
        throwError(() => new Error(error.message || 'Error al crear usuario'))
      )
    );
  }

  // ============================================================
  // Actualiza un usuario existente
  // Permite cambiar nombre, email, cedula y rol
  // No permite cambiar la contraseña aquí (está en updatePassword)
  // ============================================================
  updateUser(user: UpdateUserRequest | User): Observable<User> {
    return from(
      this.callAdminFunction<AdminFunctionUpdateResponse>('update-user', {
        id: user.id,               // ID del usuario a actualizar
        name: user.name,
        email: user.email,
        cedula: user.cedula,
        role: user.role
      })
    ).pipe(
      map(response => this.mapToUser(response.user)),
      catchError(error =>
        throwError(() => new Error(error.message || 'Error al actualizar usuario'))
      )
    );
  }

  // ============================================================
  // Cambia la contraseña de un usuario específico
  // Usa la función serverless para hacerlo de forma segura
  // ============================================================
  updatePassword(userId: string, newPassword: string): Observable<void> {
    return from(
      this.callAdminFunction<AdminFunctionPasswordResponse>('update-password', {
        userId,                    // ID del usuario
        password: newPassword      // Nueva contraseña
      })
    ).pipe(
      map(() => void 0),           // Devuelve void (nada)
      catchError(error =>
        throwError(() => new Error(error.message || 'Error al actualizar contraseña'))
      )
    );
  }

  // ============================================================
  // Elimina un usuario del sistema
  // Elimina tanto de Auth como de la tabla app_users
  // ============================================================
  deleteUser(userId: string): Observable<void> {
    return from(
      this.callAdminFunction<{ success: boolean }>('delete-user', {
        id: userId                  // ID del usuario a eliminar
      })
    ).pipe(
      map(() => void 0),
      catchError(error =>
        throwError(() => new Error(error.message || 'Error al eliminar usuario'))
      )
    );
  }

  // ============================================================
  // Método privado que llama a la función serverless de administración
  // Esta función centraliza todas las operaciones sensibles de usuarios
  // Evita exponer operaciones directas de Supabase al cliente
  // ============================================================
  private async callAdminFunction<T>(
    action: string,                               // Acción a realizar: create-user, update-user, etc.
    payload: {                                   // Datos a enviar a la función
      id?: string;
      userId?: string;
      name?: string;
      email?: string;
      cedula?: string;
      role?: UserRole;
      password?: string;
    }
  ): Promise<T> {
    // Obtiene el token del usuario autenticado (requerido por Supabase Edge Functions)
    const { data: { session } } = await this.supabaseService.getClient().auth.getSession();
    const accessToken = session?.access_token ?? environment.supabaseKey;

    // Realiza una petición HTTP POST a la función serverless
    const response = await fetch(this.getFunctionEndpoint('admin-users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': environment.supabaseKey
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    let result: unknown;

    // Intenta parsear la respuesta como JSON
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    // Si la respuesta no es exitosa (código 200-299)
    if (!response.ok) {
      // Extrae el mensaje de error de la respuesta
      const message =
        typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        typeof (result as { error: unknown }).error === 'string'
          ? (result as { error: string }).error
          : `Error HTTP ${response.status} en la función administrativa`;

      throw new Error(message);
    }

    // Devuelve el resultado casteado al tipo esperado
    return result as T;
  }

  // ============================================================
  // Método privado que convierte una fila de la BD al modelo User
  // Transforma snake_case (database) a camelCase (TypeScript)
  // ============================================================
  private mapToUser(data: AppUserRow): User {
    return {
      id: data.id,
      auth_user_id: data.auth_user_id ?? null,
      name: data.name,
      email: data.email,
      cedula: data.cedula,
      role: data.role as UserRole          // Convierte el string a tipo UserRole
    };
  }
}