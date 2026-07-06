import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="module-container">
      <div class="kid-card login-card">
        <div class="kid-card-content">
          <h1>
            <i class="fas fa-key text-yellow"></i>
            {{ showResetForm ? '¡Nueva Contraseña!' : '¡Recuperar Contraseña!' }}
            <i class="fas fa-key text-yellow"></i>
          </h1>

          <!-- Formulario de solicitud de recuperación -->
          <form *ngIf="!showResetForm" (ngSubmit)="requestReset()" #requestForm="ngForm" class="login-form">
            <div class="form-group">
              <label for="email">Tu Correo Mágico</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="email"
                required
                class="form-control kid-input"
                placeholder="ejemplo@correo.com"
                [disabled]="isLoading"
              >
            </div>

            <button type="submit" class="btn btn-kid" [disabled]="isLoading || !email">
              {{ isLoading ? 'Enviando...' : '¡Enviar Instrucciones!' }}
            </button>
          </form>

          <!-- Formulario de nueva contraseña -->
          <form *ngIf="showResetForm" (ngSubmit)="resetPassword()" #resetForm="ngForm" class="login-form">
            <div class="form-group">
              <label for="password">Nueva Contraseña Mágica</label>
              <div class="password-input-container">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  id="password"
                  name="password"
                  [(ngModel)]="newPassword"
                  required
                  minlength="8"
                  class="form-control kid-input"
                  [disabled]="isLoading"
                >
                <button 
                  type="button" 
                  class="password-toggle"
                  (click)="togglePasswordVisibility()"
                >
                  <i class="fas" [class.fa-eye]="!showPassword" [class.fa-eye-slash]="showPassword"></i>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirma tu Contraseña</label>
              <div class="password-input-container">
                <input
                  [type]="showConfirmPassword ? 'text' : 'password'"
                  id="confirmPassword"
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  required
                  class="form-control kid-input"
                  [disabled]="isLoading"
                >
                <button 
                  type="button" 
                  class="password-toggle"
                  (click)="toggleConfirmPasswordVisibility()"
                >
                  <i class="fas" [class.fa-eye]="!showConfirmPassword" [class.fa-eye-slash]="showConfirmPassword"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-kid" 
                    [disabled]="isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword">
              {{ isLoading ? 'Actualizando...' : '¡Guardar Nueva Contraseña!' }}
            </button>
          </form>

          <p *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>

          <p *ngIf="successMessage" class="success-message">
            {{ successMessage }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-message {
      color: #ff6b6b;
      margin-top: 1rem;
      text-align: center;
      font-family: 'Comic Sans MS', cursive;
    }

    .success-message {
      color: #40c057;
      margin-top: 1rem;
      text-align: center;
      font-family: 'Comic Sans MS', cursive;
    }

    .password-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-toggle {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .password-toggle:hover {
      color: #333;
    }

    .password-toggle i {
      font-size: 1.2rem;
    }

    .kid-input {
      padding-right: 40px;
    }
  `]
})
export class PasswordResetComponent {
  email: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showResetForm: boolean = false;
  token: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Verificar si hay un token en la URL
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.verifyToken();
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Solicitar recuperación de contraseña
  async requestReset() {
    if (!this.email) {
      this.errorMessage = 'Por favor, ingresa tu correo electrónico';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.successMessage = '¡Se han enviado las instrucciones a tu correo!';
        this.isLoading = false;
      },
      error: (error: { message: string; }) => {
        this.errorMessage = error.message || 'Error al procesar la solicitud';
        this.isLoading = false;
      }
    });
  }

  // Verificar token de recuperación
  private verifyToken() {
    this.isLoading = true;
    this.authService.verifyResetToken(this.token).subscribe({
      next: (isValid: any) => {
        if (isValid) {
          this.showResetForm = true;
        } else {
          this.errorMessage = 'El enlace ha expirado o no es válido';
          setTimeout(() => this.router.navigate(['/login']), 3000);
        }
        this.isLoading = false;
      },
      error: (error: { message: string; }) => {
        this.errorMessage = error.message;
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
  }

  // Actualizar contraseña
  resetPassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.successMessage = '¡Contraseña actualizada con éxito!';
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (error: { message: string; }) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }
}