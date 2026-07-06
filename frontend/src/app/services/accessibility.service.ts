// ============================================================
// SERVICIO DE ACCESIBILIDAD - Configuración de accesibilidad y lector de voz
// ============================================================

// Importa el decorador Injectable de Angular
import { Injectable } from '@angular/core';

// ============================================================
// Interfaz que define la configuración de accesibilidad
// Se guarda en localStorage para recordar las preferencias del usuario
// ============================================================
export interface AccessibilityConfig {
  fontFamily: string;   // Tipo de fuente: 'inter', 'arial', 'georgia', 'comic', 'mono', 'opendys'
  fontSize: string;    // Tamaño: 'small', 'normal', 'large', 'xlarge'
  highContrast: boolean; // Modo alto contraste: true/false
}

// ============================================================
// Decorador que hace este servicio disponible en toda la aplicación
// ============================================================
@Injectable({
  providedIn: 'root'
})

// ============================================================
// Clase que gestiona la accesibilidad de la aplicación
// Permite cambiar fuentes, tamaños y tiene un lector de voz (TTS)
// ============================================================
export class AccessibilityService {

  // Clave para guardar la configuración en localStorage del navegador
  private readonly STORAGE_KEY = 'escuelamak_accessibility';

  // ============================================================
  // Opciones de fuentes disponibles
  // Cada opción tiene un ID, nombre legible y valor CSS
  // ============================================================
  readonly fontOptions = [
    { id: 'inter',      name: 'Inter (predeterminada)', css: "'Inter', sans-serif" },
    { id: 'arial',      name: 'Arial (clara)',           css: "Arial, sans-serif" },
    { id: 'georgia',    name: 'Georgia (clásica)',       css: "Georgia, serif" },
    { id: 'comic',      name: 'Comic Sans (amigable)',   css: "'Comic Sans MS', cursive" },
    { id: 'mono',       name: 'Monospace (técnica)',     css: "'Courier New', monospace" },
    { id: 'opendys',    name: 'OpenDyslexic (dislexia)', css: "'OpenDyslexic', Arial, sans-serif" }
  ];

  // ============================================================
  // Opciones de tamaño de fuente
  // ============================================================
  readonly fontSizeOptions = [
    { id: 'small',  name: 'Pequeño',       value: '14px' },
    { id: 'normal', name: 'Normal',        value: '16px' },
    { id: 'large',  name: 'Grande',        value: '18px' },
    { id: 'xlarge', name: 'Muy grande',    value: '22px' }
  ];

  // Configuración actual (se carga desde localStorage)
  private config: AccessibilityConfig = this.getDefaultConfig();

  // Estado del sintetizador de voz (lector)
  private speaking = false;
  private synth = window.speechSynthesis; // API nativa del navegador para TTS

  // ============================================================
  // Constructor: carga y aplica la configuración guardada al iniciar
  // ============================================================
  constructor() {
    this.loadAndApply();
  }

  // ============================================================
  // Devuelve la configuración por defecto
  // Se usa cuando no hay configuración guardada
  // ============================================================
  private getDefaultConfig(): AccessibilityConfig {
    return {
      fontFamily: 'inter',
      fontSize: 'normal',
      highContrast: false
    };
  }

  // ============================================================
  // Carga la configuración desde localStorage y la aplica al documento
  // ============================================================
  loadAndApply(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        // Combina la config guardada con los defaults
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(saved) };
      }
    } catch {
      this.config = this.getDefaultConfig();
    }
    this.applyToDocument();
  }

  // ============================================================
  // Devuelve la configuración actual
  // ============================================================
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  // ============================================================
  // Guarda una nueva configuración y la aplica
  // ============================================================
  saveConfig(config: AccessibilityConfig): void {
    this.config = { ...config };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    this.applyToDocument();
  }

  // ============================================================
  // Aplica las opciones de accesibilidad al documento HTML completo
  // Modifica variables CSS del root del documento
  // ============================================================
  private applyToDocument(): void {
    const root = document.documentElement;

    // Aplica la fuente seleccionada
    const fontOption = this.fontOptions.find(f => f.id === this.config.fontFamily);
    const fontCss = fontOption?.css || "'Inter', sans-serif";
    root.style.setProperty('--app-font-family', fontCss);

    // Aplica el tamaño de fuente
    const sizeOption = this.fontSizeOptions.find(s => s.id === this.config.fontSize);
    const sizeCss = sizeOption?.value || '16px';
    root.style.setProperty('--app-font-size', sizeCss);

    // Activa/desactiva el modo alto contraste
    if (this.config.highContrast) {
      document.body.classList.add('alto-contraste');
    } else {
      document.body.classList.remove('alto-contraste');
    }
  }

  // ============================================================
  // LECTOR DE VOZ (Text-to-Speech)
  // ============================================================

  // Lee un texto en voz alta
  // @param text: texto a leer
  // @param lang: idioma (por defecto español de Colombia)
  speak(text: string, lang: string = 'es-CO'): void {
    // Si ya está leyendo, lo detenemos primero para empezar uno nuevo
    this.stop();

    // Si no hay texto, no hace nada
    if (!text || !text.trim()) return;

    // Crea el objeto de síntesis de voz
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = lang;
    utterance.rate = 0.85;    // Velocidad un poco más lenta para mayor claridad
    utterance.pitch = 1;      // Tono normal
    utterance.volume = 1;     // Volumen máximo

    // Define eventos del sintetizador
    utterance.onstart  = () => this.speaking = true;
    utterance.onend    = () => this.speaking = false;
    utterance.onerror  = () => this.speaking = false;

    // Inicia la lectura
    this.synth.speak(utterance);
    this.speaking = true;
  }

  // Detiene la lectura actual
  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();  // Cancela la lectura actual
    }
    this.speaking = false;
  }

  // Devuelve true si actualmente está leyendo algo
  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  // Lee múltiples textos concatenados (los une con puntos)
  speakMultiple(texts: string[]): void {
    const combined = texts.filter(t => t && t.trim()).join('. ');
    this.speak(combined);
  }

  // Verifica si el navegador soporta la API de síntesis de voz
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}