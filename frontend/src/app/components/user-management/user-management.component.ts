import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  User,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest
} from '../../models/user.model';
import { UserService } from '../../services/user.service';

type UserForm = {
  id: string | null;
  auth_user_id: string | null;
  name: string;
  email: string;
  cedula: string;
  role: UserRole;
  password: string;
};

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  readonly UserRole = UserRole;

  loading = false;
  saving = false;
  deletingUserId: string | null = null;
  updatingPasswordUserId: string | null = null;

  successMessage = '';
  errorMessage = '';

  showUserModal = false;
  editingUser: User | null = null;

  userForm: UserForm = this.getEmptyForm();
  newPasswords: Record<string, string> = {};

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.clearMessages();

    this.userService.getUsers().subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.loading = false;
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message || 'No se pudieron cargar los usuarios';
      }
    });
  }

  openCreateUser(): void {
    this.editingUser = null;
    this.userForm = this.getEmptyForm();
    this.showUserModal = true;
    this.clearMessages();
  }

  openEditUser(user: User): void {
    this.editingUser = user;
    this.userForm = {
      id: user.id,
      auth_user_id: user.auth_user_id ?? null,
      name: user.name,
      email: user.email,
      cedula: user.cedula,
      role: user.role,
      password: ''
    };
    this.showUserModal = true;
    this.clearMessages();
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
    this.userForm = this.getEmptyForm();
  }

  saveUser(): void {
    this.clearMessages();

    const name = this.userForm.name.trim();
    const email = this.userForm.email.trim();
    const cedula = this.userForm.cedula.trim();
    const password = this.userForm.password.trim();

    if (!name) {
      this.errorMessage = 'El nombre es obligatorio';
      return;
    }

    if (!email) {
      this.errorMessage = 'El correo es obligatorio';
      return;
    }

    if (!this.isValidEmail(email)) {
      this.errorMessage = 'El correo no es válido';
      return;
    }

    if (!cedula) {
      this.errorMessage = 'La cédula es obligatoria';
      return;
    }

    if (!this.userForm.role) {
      this.errorMessage = 'El rol es obligatorio';
      return;
    }

    if (!this.editingUser && !password) {
      this.errorMessage = 'La contraseña es obligatoria para crear usuario';
      return;
    }

    this.saving = true;

    if (this.editingUser) {
      const payload: UpdateUserRequest = {
        id: this.userForm.id as string,
        name,
        email,
        cedula,
        role: this.userForm.role
      };

      this.userService.updateUser(payload).subscribe({
        next: (updatedUser: User) => {
          this.users = this.users.map(user =>
            user.id === updatedUser.id ? updatedUser : user
          );

          this.saving = false;
          this.successMessage = 'Usuario actualizado correctamente';
          this.closeUserModal();
        },
        error: (error: Error) => {
          this.saving = false;
          this.errorMessage = error.message || 'No se pudo actualizar el usuario';
        }
      });

      return;
    }

    const createPayload: CreateUserRequest = {
      name,
      email,
      cedula,
      role: this.userForm.role,
      password
    };

    this.userService.createUser(createPayload).subscribe({
      next: (createdUser: User) => {
        this.users = [...this.users, createdUser].sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        this.saving = false;
        this.successMessage = 'Usuario creado correctamente';
        this.closeUserModal();
      },
      error: (error: Error) => {
        this.saving = false;
        this.errorMessage = error.message || 'No se pudo crear el usuario';
      }
    });
  }

  updatePassword(user: User): void {
    const newPassword = this.newPasswords[user.id]?.trim();

    this.clearMessages();

    if (!newPassword) {
      this.errorMessage = 'Debes escribir una nueva contraseña';
      return;
    }

    if (newPassword.length < 6) {
      this.errorMessage = 'La nueva contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.updatingPasswordUserId = user.id;

    this.userService.updatePassword(user.id, newPassword).subscribe({
      next: () => {
        this.updatingPasswordUserId = null;
        this.newPasswords[user.id] = '';
        this.successMessage = `Contraseña actualizada para ${user.name}`;
      },
      error: (error: Error) => {
        this.updatingPasswordUserId = null;
        this.errorMessage = error.message || 'No se pudo actualizar la contraseña';
      }
    });
  }

  deleteUser(user: User): void {
    this.clearMessages();

    const confirmed = confirm(`¿Seguro que deseas eliminar a "${user.name}"?`);

    if (!confirmed) {
      return;
    }

    this.deletingUserId = user.id;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(item => item.id !== user.id);
        delete this.newPasswords[user.id];
        this.deletingUserId = null;
        this.successMessage = `Usuario "${user.name}" eliminado correctamente`;
      },
      error: (error: Error) => {
        this.deletingUserId = null;
        this.errorMessage = error.message || 'No se pudo eliminar el usuario';
      }
    });
  }

  trackByUserId(_index: number, user: User): string {
    return user.id;
  }

  isUpdatingPassword(userId: string): boolean {
    return this.updatingPasswordUserId === userId;
  }

  isDeletingUser(userId: string): boolean {
    return this.deletingUserId === userId;
  }

  private getEmptyForm(): UserForm {
    return {
      id: null,
      auth_user_id: null,
      name: '',
      email: '',
      cedula: '',
      role: UserRole.STUDENT,
      password: ''
    };
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}