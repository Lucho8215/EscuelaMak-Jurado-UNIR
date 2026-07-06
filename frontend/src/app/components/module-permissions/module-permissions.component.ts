import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { User, UserRole } from '../../models/user.model';
import { MenuModule } from '../../models/platform-permission.model';
import { PlatformPermissionsService } from '../../services/platform-permissions.service';

interface DynamicRole {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
}

interface RoleModulePerm {
  role_code: string;
  module_key: string;
  can_view: boolean;
}

@Component({
  selector: 'app-module-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './module-permissions.component.html',
  styleUrls: ['./module-permissions.component.css']
})
export class ModulePermissionsComponent implements OnInit {
  currentUser: User | null = null;
  modules: MenuModule[] = [];

  // Roles cargados dinámicamente desde Supabase
  roles: DynamicRole[] = [];

  // Mapa: moduleKey → { roleCode → can_view }
  moduleStatuses: Map<string, Map<string, boolean>> = new Map();

  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  selectedModule: MenuModule | null = null;
  showModal = false;

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService,
    private permissionsService: PlatformPermissionsService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.modules = this.permissionsService.getMenuModules().filter(m => m.key !== 'menu_permissions');
    this.loadRolesAndPermissions();
  }

  private get supabase() {
    return this.supabaseService.getClient();
  }

  async loadRolesAndPermissions(): Promise<void> {
    this.loading = true;
    try {
      // Cargar roles desde Supabase
      const { data: rolesData, error: rolesError } = await this.supabase
        .from('custom_roles')
        .select('*')
        .order('is_default', { ascending: false });

      if (rolesError) {
        // Fallback a roles hardcodeados si la tabla no existe todavía
        this.roles = [
          { id: '1', code: 'admin',   name: 'Administrador', color: '#667eea', icon: 'fas fa-crown',              is_default: true },
          { id: '2', code: 'teacher', name: 'Profesor',      color: '#f7971e', icon: 'fas fa-chalkboard-teacher', is_default: true },
          { id: '3', code: 'tutor',   name: 'Tutor',         color: '#11998e', icon: 'fas fa-user-friends',       is_default: true },
          { id: '4', code: 'student', name: 'Estudiante',    color: '#56ab2f', icon: 'fas fa-user-graduate',      is_default: true }
        ];
      } else {
        this.roles = (rolesData ?? []) as DynamicRole[];
      }

      // Cargar permisos desde role_module_permissions
      const { data: permsData, error: permsError } = await this.supabase
        .from('role_module_permissions')
        .select('role_code, module_key, can_view');

      // Construir mapa de estados basado en los módulos del menú
      // Mapeamos las keys de menú (menu_dashboard, menu_courses…) a keys de módulo (dashboard, courses…)
      this.modules.forEach(module => {
        const moduleKey = module.key.replace('menu_', '');
        const roleMap = new Map<string, boolean>();
        this.roles.forEach(role => {
          let canView = false;
          if (!permsError && permsData) {
            const perm = permsData.find(
              (p: RoleModulePerm) => p.role_code === role.code && p.module_key === moduleKey
            );
            canView = perm ? perm.can_view : false;
          }
          roleMap.set(role.code, canView);
        });
        this.moduleStatuses.set(module.key, roleMap);
      });

    } catch (e) {
      console.error('Error loading roles/permissions:', e);
    } finally {
      this.loading = false;
    }
  }

  getModuleStatus(moduleKey: string, roleCode: string): boolean {
    return this.moduleStatuses.get(moduleKey)?.get(roleCode) ?? false;
  }

  async toggleModule(moduleKey: string, roleCode: string): Promise<void> {
    if (!this.isAdmin()) {
      this.errorMessage = '❌ Solo administradores pueden modificar permisos.';
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }

    const moduleKeyShort = moduleKey.replace('menu_', '');
    const currentStatus = this.getModuleStatus(moduleKey, roleCode);
    const newStatus = !currentStatus;

    // Actualizar en memoria inmediatamente
    this.moduleStatuses.get(moduleKey)?.set(roleCode, newStatus);

    this.saving = true;
    try {
      const { error } = await this.supabase
        .from('role_module_permissions')
        .upsert({
          role_code: roleCode,
          module_key: moduleKeyShort,
          can_view: newStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: 'role_code,module_key' });

      if (error) throw error;

      this.successMessage = '✅ Permiso actualizado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (e: any) {
      // Revertir en caso de error
      this.moduleStatuses.get(moduleKey)?.set(roleCode, currentStatus);
      this.errorMessage = '❌ Error al guardar: ' + (e?.message ?? 'Error desconocido');
      setTimeout(() => this.errorMessage = '', 5000);
    } finally {
      this.saving = false;
    }
  }

  getEnabledCount(moduleKey: string): number {
    const roleMap = this.moduleStatuses.get(moduleKey);
    if (!roleMap) return 0;
    let count = 0;
    roleMap.forEach(v => { if (v) count++; });
    return count;
  }

  openModuleDetails(module: MenuModule): void {
    this.selectedModule = module;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedModule = null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === UserRole.ADMIN;
  }
}
