import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/*
AUTH GUARD

Este guard protege las rutas privadas.

Funciona así:

1️⃣ verifica si hay un usuario logueado
2️⃣ si NO hay usuario → redirige a /login
3️⃣ si hay usuario → permite entrar a la ruta
*/

export const authGuard: CanActivateFn = () => {

  // Inyectamos el servicio de autenticación
  const authService = inject(AuthService);

  // Router para redirecciones
  const router = inject(Router);

  // Obtenemos el usuario actual
  const currentUser = authService.getCurrentUser();

  // Si NO hay usuario logueado
  if (!currentUser) {

    // redirige al login
    return router.createUrlTree(['/login']);
  }

  // Si hay usuario → permite acceder
  return true;
};