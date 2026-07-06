import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          // Fix: reemplazar NavigatorLocks por función simple.
          // Supabase intenta usar navigator.locks para sincronizar pestañas.
          // Si el navegador no lo soporta bien genera 31+ errores en consola.
          // Esta función cumple el mismo contrato (ejecuta fn()) sin el lock real.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn() as any,

          // Renovar token automáticamente antes de que expire
          autoRefreshToken: true,

          // Detectar cambios de sesión en otras pestañas
          detectSessionInUrl: true,
        }
      }
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getUrl(): string {
    return environment.supabaseUrl;
  }
}