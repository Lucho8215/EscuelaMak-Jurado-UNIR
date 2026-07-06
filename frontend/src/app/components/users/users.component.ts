import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ModuleService, LearningModule } from '../../services/module.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="module-container">
      <a routerLink="/dashboard" class="btn btn-back">
        <i class="fas fa-arrow-left"></i> Volver al Panel
      </a>
      
      <h1>
        <i class="fas fa-graduation-cap text-blue"></i>
        ¡Mis Módulos de Aprendizaje!
        <i class="fas fa-graduation-cap text-blue"></i>
      </h1>
      <div class="card-grid">
        <div 
          class="kid-card {{module.color}}" 
          *ngFor="let module of modules"
        >
          <div class="kid-card-content">
            <i class="fas {{module.icon}} card-icon"></i>
            <h3>{{module.title}}</h3>
            <p>{{module.description}}</p>
            <button class="btn btn-kid">¡Iniciar Módulo!</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  modules: LearningModule[] = [];

  constructor(private moduleService: ModuleService) {}

  ngOnInit() {
    this.moduleService.getModules().subscribe(modules => {
      this.modules = modules;
    });
  }
}