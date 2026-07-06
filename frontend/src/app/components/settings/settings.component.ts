import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { Role, Permission } from '../../models/role.model';
import { User, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-container">
      <a routerLink="/dashboard" class="btn btn-back">
        <i class="fas fa-arrow-left"></i> Volver al Panel
      </a>
      
      <h1>
        <i class="fas fa-wand-magic-sparkles text-blue"></i>
        Configuración del Sistema
        <i class="fas fa-wand-magic-sparkles text-blue"></i>
      </h1>
      
      <!-- Gestión de Roles -->
      <h2 class="section-title">Roles y Permisos</h2>
      <div class="card-grid">
        <div class="kid-card" *ngFor="let role of roles">
          <div class="kid-card-content">
            <i class="fas" [ngClass]="getRoleIcon(role.name)" class="card-icon"></i>
            <h3>{{role.name}}</h3>
            <p>{{role.description}}</p>
            
            <div class="permissions-list">
              <div *ngFor="let permission of availablePermissions" class="permission-item">
                <label class="permission-label">
                  <input
                    type="checkbox"
                    [checked]="hasPermission(role, permission.code)"
                    (change)="togglePermission(role, permission.code)"
                  >
                  {{permission.name}}
                </label>
              </div>
            </div>
            
            <button class="btn btn-kid" (click)="savePermissions(role)">
              ¡Guardar Cambios!
            </button>
          </div>
        </div>
      </div>

      <!-- Gestión de Usuarios -->
      <h2 class="section-title">Crear Usuario</h2>
      <div class="kid-card create-user-card">
        <div class="kid-card-content">
          <i class="fas fa-user-plus card-icon"></i>
          <form (ngSubmit)="createUser()" #userForm="ngForm" class="user-form">
            <div class="form-group">
              <label for="name">Nombre</label>
              <input
                type="text"
                id="name"
                name="name"
                [(ngModel)]="newUser.name"
                required
                class="kid-input"
              >
            </div>
            <div class="form-group">
              <label for="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="newUser.email"
                required
                class="kid-input"
              >
            </div>
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="newUser.password"
                required
                class="kid-input"
              >
            </div>
            <div class="form-group">
              <label for="role">Rol</label>
              <select
                id="role"
                name="role"
                [(ngModel)]="newUser.role"
                required
                class="kid-input"
              >
                <option [value]="UserRole.ADMIN">Administrador</option>
                <option [value]="UserRole.TEACHER">Profesor</option>
                <option [value]="UserRole.TUTOR">Tutor</option>
                <option [value]="UserRole.STUDENT">Estudiante</option>
              </select>
            </div>
            <button type="submit" class="btn btn-kid">¡Crear Usuario!</button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-title {
      font-family: 'Comic Sans MS', cursive;
      color: #333;
      text-align: center;
      margin: 2rem 0;
      font-size: 2rem;
    }

    .create-user-card {
      max-width: 600px;
      margin: 2rem auto;
    }

    .user-form {
      width: 100%;
    }

    .permissions-list {
      width: 100%;
      margin: 1rem 0;
      text-align: left;
    }
    
    .permission-item {
      margin: 0.5rem 0;
    }
    
    .permission-label {
      color: white;
      font-family: 'Comic Sans MS', cursive;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    
    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
  `]
})
export class SettingsComponent implements OnInit {
  roles: Role[] = [];
  availablePermissions: Permission[] = [];
  UserRole = UserRole;
  
 newUser: Omit<User, 'id'> & { password: string } = {
  name: '',
  email: '',
  cedula: '',
  password: '',
  role: UserRole.STUDENT
};
  
  constructor(
    private roleService: RoleService,
    private userService: UserService
  ) {}
  
  ngOnInit() {
    this.roleService.getRoles().subscribe(roles => {
      this.roles = roles;
    });
    
    this.roleService.getAvailablePermissions().subscribe(permissions => {
      this.availablePermissions = permissions;
    });
  }
  
  getRoleIcon(roleName: string): string {
    const icons = {
      'Administrador': 'fa-user-shield',
      'Profesor': 'fa-chalkboard-teacher',
      'Tutor': 'fa-user-graduate',
      'Estudiante': 'fa-user'
    };
    return icons[roleName as keyof typeof icons] || 'fa-user';
  }
  
  hasPermission(role: Role, permissionCode: string): boolean {
    return role.permissions.includes(permissionCode);
  }
  
  togglePermission(role: Role, permissionCode: string) {
    if (this.hasPermission(role, permissionCode)) {
      role.permissions = role.permissions.filter(p => p !== permissionCode);
    } else {
      role.permissions.push(permissionCode);
    }
  }
  
  savePermissions(role: Role) {
    this.roleService.updateRolePermissions(role.id, role.permissions).subscribe(() => {
      console.log('Permisos actualizados con éxito');
    });
  }

  createUser() {
    if (this.newUser.name && this.newUser.email && this.newUser.password && this.newUser.role) {
      this.userService.createUser(this.newUser).subscribe(user => {
        console.log('Usuario creado con éxito:', user);
        // Limpiar el formulario
       this.newUser = {
            name: '',
            email: '',
            cedula: '',
            password: '',
            role: UserRole.STUDENT
        };
      });
    }
  }
}