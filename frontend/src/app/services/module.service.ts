// ============================================================
// SERVICIO DE MÓDULOS - Gestiona los módulos de aprendizaje
// ============================================================

// Importa el decorador Injectable de Angular
import { Injectable } from '@angular/core';

// Importa herramientas de RxJS
import { Observable, of } from 'rxjs';

// ============================================================
// Interfaz que define la estructura de un módulo de aprendizaje
// ============================================================
export interface LearningModule {
  id: string;          // Identificador único del módulo
  title: string;      // Título que se muestra al usuario
  description: string; // Descripción breve del contenido
  icon: string;       // Clase de icono (FontAwesome)
  color: string;      // Clase de color CSS para el diseño
}

// ============================================================
// Decorador que hace este servicio disponible en toda la aplicación
// ============================================================
@Injectable({
  providedIn: 'root'
})

// ============================================================
// Clase que gestiona los módulos de aprendizaje
// Proporciona los datos de los módulos a los componentes
// ============================================================
export class ModuleService {
  // ============================================================
  // Lista de módulos de aprendizaje disponibles
  // En producción, esto podría venir de una API o base de datos
  // ============================================================
  private modules: LearningModule[] = [
    // Módulo 1: Números
    {
      id: '1',
      title: '¡Números Mágicos!',
      description: 'Aprende a contar del 1 al 10',
      icon: 'fa-dice-d20',           // Icono de dados
      color: 'numbers-card'          // Color asociado
    },
    // Módulo 2: Formas geométricas
    {
      id: '2',
      title: '¡Formas Divertidas!',
      description: 'Descubre círculos y cuadrados',
      icon: 'fa-shapes',              // Icono de formas
      color: 'shapes-card'
    },
    // Módulo 3: Sumas básicas
    {
      id: '3',
      title: '¡Sumas Mágicas!',
      description: 'Aprende a sumar jugando',
      icon: 'fa-plus-minus',          // Icono de suma/resta
      color: 'games-card'
    },
    // Módulo 4: Colores
    {
      id: '4',
      title: '¡Colores y Números!',
      description: 'Mezcla colores y números',
      icon: 'fa-palette',             // Icono de paleta
      color: 'theme-card'
    }
  ];

  // ============================================================
  // Devuelve la lista de todos los módulos disponibles
  // Los componentes pueden suscribirse para obtener los datos
  // ============================================================
  getModules(): Observable<LearningModule[]> {
    return of(this.modules);
  }
}