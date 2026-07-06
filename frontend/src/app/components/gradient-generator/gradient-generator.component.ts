import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

/**
 * Par de color y posición para un punto del gradiente CSS.
 * - color: valor hex (ej. #667eea)
 * - position: porcentaje 0-100
 */
interface ColorStop {
  color: string;
  position: number;
}

/**
 * Componente Generador de Gradientes CSS.
 * Permite crear gradientes lineales, radiales y cónicos, ver el código CSS
 * y exportarlo (copiar, descargar .css o .scss).
 * Para qué sirve: Herramienta de diseño para admin/profesor crear estilos
 * visuales para el LMS (fondos, botones, etc.).
 */

@Component({
  selector: 'app-gradient-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="gradient-generator">
      <a routerLink="/dashboard" class="btn btn-back">
        <i class="fas fa-arrow-left"></i> Volver al Panel
      </a>
      
      <h1>
        <i class="fas fa-palette text-purple"></i>
        Generador de Gradientes CSS
        <i class="fas fa-palette text-purple"></i>
      </h1>

      <div class="generator-container">
        <!-- Panel de Controles -->
        <div class="controls-panel">
          <div class="control-section">
            <h3><i class="fas fa-sliders-h"></i> Configuración</h3>
            
            <div class="form-group">
              <label>Tipo de Gradiente</label>
              <select [(ngModel)]="gradientType" (change)="updateGradient()">
                <option value="linear">Lineal</option>
                <option value="radial">Radial</option>
                <option value="conic">Cónico</option>
              </select>
            </div>

            <div class="form-group" *ngIf="gradientType === 'linear'">
              <label>Dirección: {{angle}}°</label>
              <input 
                type="range" 
                [(ngModel)]="angle" 
                (input)="updateGradient()"
                min="0" 
                max="360"
              >
              <div class="direction-presets">
                <button (click)="setAngle(0)" [class.active]="angle === 0">→</button>
                <button (click)="setAngle(45)" [class.active]="angle === 45">↗</button>
                <button (click)="setAngle(90)" [class.active]="angle === 90">↓</button>
                <button (click)="setAngle(135)" [class.active]="angle === 135">↘</button>
                <button (click)="setAngle(180)" [class.active]="angle === 180">←</button>
                <button (click)="setAngle(225)" [class.active]="angle === 225">↙</button>
                <button (click)="setAngle(270)" [class.active]="angle === 270">↑</button>
                <button (click)="setAngle(315)" [class.active]="angle === 315">↖</button>
              </div>
            </div>

            <div class="form-group" *ngIf="gradientType === 'radial'">
              <label>Forma</label>
              <select [(ngModel)]="radialShape" (change)="updateGradient()">
                <option value="circle">Circular</option>
                <option value="ellipse">Elíptica</option>
              </select>
            </div>

            <div class="form-group" *ngIf="gradientType === 'conic'">
              <label>Ángulo Inicial: {{conicAngle}}°</label>
              <input 
                type="range" 
                [(ngModel)]="conicAngle" 
                (input)="updateGradient()"
                min="0" 
                max="360"
              >
            </div>
          </div>

          <div class="control-section">
            <h3><i class="fas fa-paint-brush"></i> Colores</h3>
            
            <div class="color-stops">
              <div class="color-stop" *ngFor="let stop of colorStops; let i = index">
                <input 
                  type="color" 
                  [(ngModel)]="stop.color" 
                  (input)="updateGradient()"
                  class="color-picker"
                >
                <input 
                  type="range" 
                  [(ngModel)]="stop.position" 
                  (input)="updateGradient()"
                  min="0" 
                  max="100"
                  class="position-slider"
                >
                <span class="position-value">{{stop.position}}%</span>
                <button 
                  class="btn-remove" 
                  (click)="removeColorStop(i)"
                  *ngIf="colorStops.length > 2"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <button class="btn btn-add-color" (click)="addColorStop()">
              <i class="fas fa-plus"></i> Agregar Color
            </button>
          </div>

          <div class="control-section">
            <h3><i class="fas fa-magic"></i> Preajustes</h3>
            <div class="presets-grid">
              <button 
                *ngFor="let preset of presets" 
                class="preset-btn"
                [style.background]="preset.preview"
                (click)="applyPreset(preset)"
                [title]="preset.name"
              ></button>
            </div>
          </div>
        </div>

        <!-- Vista Previa -->
        <div class="preview-panel">
          <div 
            class="gradient-preview"
            [style]="gradientStyle"
          >
            <div class="preview-overlay">
              <span>Vista Previa</span>
            </div>
          </div>

          <div class="css-output">
            <h3><i class="fas fa-code"></i> Código CSS</h3>
            <div class="code-block">
              <code>{{cssCode}}</code>
              <button class="btn-copy" (click)="copyToClipboard()" title="Copiar al portapapeles">
                <i class="fas" [class.fa-copy]="!copied" [class.fa-check]="copied"></i>
              </button>
            </div>
          </div>

          <div class="export-options">
            <h3><i class="fas fa-download"></i> Exportar</h3>
            <div class="export-buttons">
              <button class="btn btn-export" (click)="exportAsCSS()">
                <i class="fas fa-file-code"></i> CSS
              </button>
              <button class="btn btn-export" (click)="exportAsSCSS()">
                <i class="fas fa-file-code"></i> SCSS
              </button>
              <button class="btn btn-export" (click)="downloadAsFile()">
                <i class="fas fa-download"></i> Descargar archivo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gradient-generator {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      color: var(--text-color, #333);
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .text-purple {
      color: #8b5cf6;
    }

    .generator-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 1024px) {
      .generator-container {
        grid-template-columns: 1fr;
      }
    }

    .controls-panel {
      background: var(--card-bg, #fff);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .control-section {
      margin-bottom: 2rem;
    }

    .control-section h3 {
      color: var(--text-color, #333);
      margin-bottom: 1rem;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-color, #555);
      font-weight: 500;
    }

    .form-group select,
    .form-group input[type="range"] {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
    }

    .form-group select:focus,
    .form-group input:focus {
      outline: none;
      border-color: #8b5cf6;
    }

    .direction-presets {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .direction-presets button {
      padding: 0.5rem;
      border: 2px solid #e5e7eb;
      background: #fff;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.2s;
    }

    .direction-presets button:hover,
    .direction-presets button.active {
      border-color: #8b5cf6;
      background: #8b5cf6;
      color: white;
    }

    .color-stops {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .color-stop {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .color-picker {
      width: 50px;
      height: 40px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      padding: 0;
    }

    .position-slider {
      flex: 1;
    }

    .position-value {
      min-width: 45px;
      text-align: right;
      font-weight: 500;
    }

    .btn-remove {
      background: #ef4444;
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-remove:hover {
      background: #dc2626;
    }

    .btn-add-color {
      width: 100%;
      padding: 0.75rem;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
      transition: background 0.2s;
    }

    .btn-add-color:hover {
      background: #7c3aed;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    .preset-btn {
      aspect-ratio: 1;
      border: 3px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
    }

    .preset-btn:hover {
      transform: scale(1.05);
      border-color: #8b5cf6;
    }

    .preview-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .gradient-preview {
      width: 100%;
      height: 300px;
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    }

    .preview-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.2);
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }

    .css-output {
      background: #1e1e1e;
      border-radius: 12px;
      padding: 1.25rem;
    }

    .css-output h3 {
      color: #fff;
      margin-bottom: 1rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .code-block {
      position: relative;
      background: #2d2d2d;
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
    }

    .code-block code {
      color: #a5d6ff;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.9rem;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .btn-copy {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: #4a4a4a;
      color: #fff;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-copy:hover {
      background: #5a5a5a;
    }

    .export-options {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .export-options h3 {
      color: var(--text-color, #333);
      margin-bottom: 1rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .export-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-export {
      flex: 1;
      min-width: 120px;
      padding: 0.75rem 1rem;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-export:hover {
      background: #7c3aed;
      transform: translateY(-2px);
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
      text-decoration: none;
      margin-bottom: 1.5rem;
      transition: color 0.2s;
    }

    .btn-back:hover {
      color: #8b5cf6;
    }
  `]
})
export class GradientGeneratorComponent {
  /** Tipo de gradiente: lineal, radial o cónico */
  gradientType: 'linear' | 'radial' | 'conic' = 'linear';
  /** Ángulo en grados para gradientes lineales (0-360) */
  angle: number = 90;
  /** Forma del gradiente radial: circular o elíptica */
  radialShape: 'circle' | 'ellipse' = 'circle';
  /** Ángulo inicial para gradientes cónicos */
  conicAngle: number = 0;
  /** Indica si el código CSS se copió al portapapeles */
  copied: boolean = false;

  /** Lista de colores y posiciones del gradiente */
  colorStops: ColorStop[] = [
    { color: '#667eea', position: 0 },
    { color: '#764ba2', position: 100 }
  ];

  /** Estilo CSS aplicado a la vista previa */
  gradientStyle: string = '';
  /** Código CSS generado para copiar/exportar */
  cssCode: string = '';

  /** Preajustes de gradientes predefinidos para aplicar rápidamente */
  presets = [
    { name: 'Aurora', colors: ['#667eea', '#764ba2'], preview: 'linear-gradient(90deg, #667eea, #764ba2)' },
    { name: 'Sunset', colors: ['#f093fb', '#f5576c'], preview: 'linear-gradient(90deg, #f093fb, #f5576c)' },
    { name: 'Ocean', colors: ['#4facfe', '#00f2fe'], preview: 'linear-gradient(90deg, #4facfe, #00f2fe)' },
    { name: 'Forest', colors: ['#11998e', '#38ef7d'], preview: 'linear-gradient(90deg, #11998e, #38ef7d)' },
    { name: 'Fire', colors: ['#f12711', '#f5af19'], preview: 'linear-gradient(90deg, #f12711, #f5af19)' },
    { name: 'Purple Haze', colors: ['#c471ed', '#f64f59'], preview: 'linear-gradient(90deg, #c471ed, #f64f59)' },
    { name: 'Midnight', colors: ['#232526', '#414345'], preview: 'linear-gradient(90deg, #232526, #414345)' },
    { name: 'Candy', colors: ['#d53369', '#daae51'], preview: 'linear-gradient(90deg, #d53369, #daae51)' },
    { name: 'Royal', colors: ['#141e30', '#243b55'], preview: 'linear-gradient(90deg, #141e30, #243b55)' },
    { name: 'Peach', colors: ['#ed4264', '#ffedbc'], preview: 'linear-gradient(90deg, #ed4264, #ffedbc)' },
    { name: 'Steel', colors: ['#868f96', '#596164'], preview: 'linear-gradient(90deg, #868f96, #596164)' },
    { name: 'Lemon', colors: ['#f6d365', '#fda085'], preview: 'linear-gradient(90deg, #f6d365, #fda085)' }
  ];

  constructor() {
    this.updateGradient();
  }

  /** Establece el ángulo del gradiente lineal y actualiza la vista previa */
  setAngle(value: number) {
    this.angle = value;
    this.updateGradient();
  }

  /** Añade un nuevo color al gradiente con posición automática */
  addColorStop() {
    const newPosition = this.colorStops.length > 0 
      ? Math.max(...this.colorStops.map(s => s.position)) + 10
      : 50;
    this.colorStops.push({
      color: this.getRandomColor(),
      position: Math.min(newPosition, 100)
    });
    this.updateGradient();
  }

  /** Elimina un color del gradiente (mínimo 2 colores) */
  removeColorStop(index: number) {
    if (this.colorStops.length > 2) {
      this.colorStops.splice(index, 1);
      this.updateGradient();
    }
  }

  /** Genera un color hex aleatorio para nuevos puntos del gradiente */
  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /** Aplica un preajuste de gradiente (reemplaza los colores actuales) */
  applyPreset(preset: any) {
    this.colorStops = preset.colors.map((color: string, index: number) => ({
      color,
      position: index === 0 ? 0 : 100
    }));
    this.updateGradient();
  }

  /** Genera la cadena CSS del gradiente según tipo y colores */
  generateGradientString(): string {
    const sortedStops = [...this.colorStops].sort((a, b) => a.position - b.position);
    const stopsString = sortedStops
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');

    switch (this.gradientType) {
      case 'linear':
        return `linear-gradient(${this.angle}deg, ${stopsString})`;
      case 'radial':
        return `radial-gradient(${this.radialShape} at center, ${stopsString})`;
      case 'conic':
        return `conic-gradient(from ${this.conicAngle}deg at center, ${stopsString})`;
      default:
        return `linear-gradient(${this.angle}deg, ${stopsString})`;
    }
  }

  /** Actualiza la vista previa y el código CSS tras cambios */
  updateGradient() {
    const gradient = this.generateGradientString();
    this.gradientStyle = `background: ${gradient};`;
    this.cssCode = `background: ${gradient};`;
  }

  /** Copia el código CSS al portapapeles */
  copyToClipboard() {
    navigator.clipboard.writeText(this.cssCode).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    });
  }

  /** Descarga el gradiente como archivo .css */
  exportAsCSS(): void {
    const css = `/* Generated Gradient CSS */
.gradient {
  ${this.cssCode}
}
`;
    this.downloadFile(css, 'gradient.css', 'text/css');
  }

  /** Descarga el gradiente como archivo .scss con mixin */
  exportAsSCSS(): void {
    const scss = `// Generated Gradient SCSS
$gradient-direction: ${this.gradientType === 'linear' ? this.angle + 'deg' : this.gradientType};
$gradient-colors: (
${this.colorStops.map(stop => `  ${stop.position}%: ${stop.color}`).join(',\n')}
);

@mixin gradient-background {
  background: ${this.cssCode.replace('background: ', '')};
}

.gradient {
  @include gradient-background;
}
`;
    this.downloadFile(scss, 'gradient.scss', 'text/x-scss');
  }

  /** Descarga el gradiente como archivo (usa exportAsCSS internamente) */
  downloadAsFile(): void {
    this.exportAsCSS();
  }

  /** Utilidad interna: crea un Blob y dispara la descarga del archivo */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
