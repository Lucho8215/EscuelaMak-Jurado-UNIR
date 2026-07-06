import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CoursesComponent } from './components/courses/courses.component';
import { UsersComponent } from './components/users/users.component';
import { ReviewComponent } from './components/review/review.component';
import { SettingsComponent } from './components/settings/settings.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { CourseManagementComponent } from './components/course-management/course-management.component';
import { SupabaseTestComponent } from './components/supabase-test/supabase-test.component';
import { ParametersComponent } from './components/parameters/parameters.component';
import { QuizManagementComponent } from './components/quiz-management/quiz-management.component';
import { QuizTakingComponent } from './components/quiz-taking/quiz-taking.component';
import { StudentQuizzesComponent } from './components/student-quizzes/student-quizzes.component';
import { ClassManagementComponent } from './components/class-management/class-management.component';
import { AppLayoutComponent } from './components/layout/app-layout.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { UserRole } from './models/user.model';
import { LessonManagementComponent } from './components/lesson-management/lesson-management.component';
import { StudentLessonsComponent } from './components/student-lessons/student-lessons.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { GradientGeneratorComponent } from './components/gradient-generator/gradient-generator.component';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { ModulePermissionsComponent } from './components/module-permissions/module-permissions.component';


export const routes: Routes = [
  /**
   * Ruta inicial:
   * cuando la app arranca, manda al login
   */
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  /**
   * Ruta pública:
   * no necesita sesión
   */
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'password-reset',
    component: PasswordResetComponent
  },
  
  /**
   * Dashboard del estudiante (ruta pública)
   */
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent
  },

  /**
   * Lecciones del estudiante
   */
  {
    path: 'lesson-management/:courseId',
    component: LessonManagementComponent
  },
  {
    path: 'my-lessons',
    component: StudentLessonsComponent
  },

  /**
   * Quizzes del estudiante
   */
  {
    path: 'my-quizzes',
    component: StudentQuizzesComponent
  },

  /**
   * Grupo de rutas privadas:
   * todas usan AppLayoutComponent como contenedor
   */
  { 
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'courses',
        component: CoursesComponent
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [roleGuard([UserRole.ADMIN])]
      },
      {
        path: 'review',
        component: ReviewComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR])]
      },
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [roleGuard([UserRole.ADMIN])]
      },
      {
        path: 'user-management',
        component: UserManagementComponent,
        canActivate: [roleGuard([UserRole.ADMIN])]
      },
      {
        path: 'course-management',
        component: CourseManagementComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.TEACHER])]
      },
      {
        path: 'supabase-test',
        component: SupabaseTestComponent,
        canActivate: [roleGuard([UserRole.ADMIN])]
      },
      {
        path: 'parameters',
        component: ParametersComponent,
        canActivate: [roleGuard([UserRole.ADMIN])]
      },
      {
        path: 'quiz-management',
        component: QuizManagementComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR])]
      },
      {
        path: 'quiz/:id',
        component: QuizTakingComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.TEACHER, UserRole.TUTOR, UserRole.STUDENT])]
      },
      {
        path: 'class-management',
        component: ClassManagementComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.TEACHER])]
      },
      {
        path: 'gradient-generator',
        component: GradientGeneratorComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.TEACHER])]
      },
      {
        path: 'module-permissions',
        component: ModulePermissionsComponent,
        canActivate: [roleGuard([UserRole.ADMIN])]
      }
    ]
  },

  /**
   * Cualquier ruta desconocida
   * redirige al login
   */
  { path: '**', redirectTo: '/login' }
];
