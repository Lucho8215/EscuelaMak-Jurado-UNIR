import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-supabase-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="kid-card">
        <div class="kid-card-content">
          <h1>
            <i class="fas fa-database text-purple"></i>
            Estado de Conexión Supabase
            <i class="fas fa-database text-purple"></i>
          </h1>

          <div class="connection-status">
            <p>
              <strong>URL de Supabase:</strong>
              <span [class.text-success]="isValidUrl">{{maskedUrl}}</span>
            </p>
            
            <p>
              <strong>Estado de la Conexión:</strong>
              <span [class.text-success]="isConnected" [class.text-danger]="!isConnected">
                {{connectionStatus}}
              </span>
            </p>

            <p>
              <strong>Tiempo de Respuesta:</strong>
              <span>{{responseTime}}ms</span>
            </p>

            <div *ngIf="error" class="error-message">
              {{error}}
            </div>

            <div *ngIf="retryCount > 0" class="retry-message">
              Intentos de conexión: {{retryCount}}/3
            </div>
          </div>

          <button class="btn btn-kid" (click)="testConnection()" [disabled]="isLoading">
            {{ isLoading ? 'Probando...' : 'Probar Conexión' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connection-status {
      text-align: left;
      margin: 2rem 0;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
    }

    .connection-status p {
      margin: 1rem 0;
      color: white;
      font-family: 'Comic Sans MS', cursive;
    }

    .text-success {
      color: #40c057 !important;
      font-weight: bold;
    }

    .text-danger {
      color: #ff6b6b !important;
      font-weight: bold;
    }

    .error-message {
      color: #ff6b6b;
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(255, 0, 0, 0.1);
      border-radius: 10px;
      font-family: 'Comic Sans MS', cursive;
    }

    .retry-message {
      color: #ffd43b;
      margin-top: 1rem;
      padding: 0.5rem;
      font-style: italic;
      font-family: 'Comic Sans MS', cursive;
    }

    strong {
      color: white;
      margin-right: 0.5rem;
    }
  `]
})
export class SupabaseTestComponent implements OnInit {
  private supabase: SupabaseClient;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  
  isConnected: boolean = false;
  isLoading: boolean = false;
  connectionStatus: string = 'Desconectado';
  responseTime: number = 0;
  error: string = '';
  isValidUrl: boolean = false;
  maskedUrl: string = '';
  retryCount: number = 0;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: { 'x-custom-timeout': '30000' },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000)
          });
        }
      }
    });
    
    this.maskedUrl = this.maskUrl(environment.supabaseUrl);
    this.isValidUrl = this.validateUrl(environment.supabaseUrl);
  }

  ngOnInit() {
    this.testConnection();
  }

  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname.split('.')[0]}.*****`;
    } catch {
      return 'URL inválida';
    }
  }

  private validateUrl(url: string): boolean {
    try {
      new URL(url);
      return url.includes('supabase.co');
    } catch {
      return false;
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    this.retryCount = 0;
    let lastError: any;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        this.retryCount = i + 1;
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`Retry ${i + 1}/${this.maxRetries} failed:`, error.message);
        
        if (i < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async testConnection() {
    this.isLoading = true;
    this.error = '';
    const startTime = performance.now();

    try {
      await this.retryOperation(async () => {
        const { data, error } = await this.supabase.rpc('verify_connection');
        
        if (error) throw error;
        return data;
      });

      const endTime = performance.now();
      this.responseTime = Math.round(endTime - startTime);
      this.isConnected = true;
      this.connectionStatus = '¡Conectado correctamente!';
    } catch (err: any) {
      this.isConnected = false;
      this.connectionStatus = 'Error de conexión';
      this.error = err.message || 'Error al conectar con Supabase';
      console.error('Error de conexión:', err);
    } finally {
      this.isLoading = false;
    }
  }
}