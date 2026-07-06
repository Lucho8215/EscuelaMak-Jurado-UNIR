import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { UserService } from './user.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private connectionStatus = new BehaviorSubject<boolean>(true);
  connectionStatus$ = this.connectionStatus.asObservable();

  constructor(
    private userService: UserService,
    private supabaseService: SupabaseService
  ) {
    this.loadSavedUser();
  }

  private loadSavedUser(): void {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser) as User;
        this.currentUserSubject.next(user);
      }
    } catch {
      localStorage.removeItem('currentUser');
    }
  }

  // Devuelve solo los campos necesarios para la UI.
  // No guarda cedula ni auth_user_id en localStorage.
  private toSafeUser(user: User): Partial<User> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // cedula y auth_user_id quedan solo en memoria, no en disco
    };
  }

  login(email: string, password: string): Observable<User> {
    if (!email || !password) {
      return throwError(() => new Error('Por favor, ingresa tu email y contraseña.'));
    }

    const supabase = this.supabaseService.getClient();

    return from(
      supabase.auth.signInWithPassword({ email, password })
    ).pipe(
      switchMap(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('Usuario no encontrado');
        }

        const authUserId = data.user.id;

        // Sincronizar auth_user_id en app_users para que la app móvil
        // pueda encontrar al usuario en conversations/participant_ids
        supabase.from('app_users')
          .update({ auth_user_id: authUserId })
          .eq('email', email)
          .then(() => {});

        return from(this.userService.getUserByEmail(email));
      }),
      map(user => {
        if (!user) {
          throw new Error('Usuario no encontrado en la base de datos');
        }

        // Guardar en localStorage solo datos no sensibles (sin cedula, sin auth_user_id)
        localStorage.setItem('currentUser', JSON.stringify(this.toSafeUser(user)));
        // En memoria sí mantenemos el objeto completo para uso interno
        this.currentUserSubject.next(user);
        this.connectionStatus.next(true);

        return user;
      }),
      catchError(error => {
        console.error('Error de inicio de sesión:', error);
        return throwError(() => new Error(
          error.message || 'Error al iniciar sesión. Por favor, intenta de nuevo.'
        ));
      })
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    return from(
      this.supabaseService.getClient().auth.resetPasswordForEmail(email)
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  verifyResetToken(token: string): Observable<boolean> {
    return from(
      this.supabaseService.getClient().auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      })
    ).pipe(
      map(({ error }) => !error),
      catchError(() => of(false))
    );
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    void token;

    return from(
      this.supabaseService.getClient().auth.updateUser({ password: newPassword })
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
      }),
      catchError(error => throwError(() => new Error(error.message)))
    );
  }

  logout(): void {
    this.supabaseService.getClient().auth.signOut();
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();

    if (!user) {
      return false;
    }

    const permissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: [
        'manage_users',
        'manage_permissions',
        'view_courses',
        'review_exercises',
        'create_courses',
        'edit_courses',
        'create_quizzes',
        'edit_quizzes',
        'submit_exercises'
      ],
      [UserRole.TEACHER]: [
        'view_courses',
        'create_courses',
        'edit_courses',
        'create_quizzes',
        'edit_quizzes',
        'review_exercises'
      ],
      [UserRole.TUTOR]: [
        'view_courses',
        'review_exercises',
        'create_quizzes'
      ],
      [UserRole.STUDENT]: [
        'view_courses',
        'submit_exercises',
        'take_quizzes'
      ]
    };

    return permissions[user.role]?.includes(permission) || false;
  }
}