import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';

import type { RolUsuario, Usuario } from '../models/usuario.model';

import { SupabaseService } from './supabase.service';

const PASSWORD_INICIAL = 'Ecuador2026';
const ROLES_USUARIO: readonly RolUsuario[] = ['PROVINCIAL', 'RECINTO', 'VEEDOR'];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly inicializacion: Promise<void>;

  readonly sesion = signal<Session | null>(null);
  readonly perfil = signal<Usuario | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly sesionInicializada = signal(false);
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly debeCambiarPassword = computed(() => this.perfil()?.debe_cambiar_password ?? false);

  constructor() {
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.sesion.set(session);
      this.perfil.set(null);

      if (session) {
        const userId = session.user.id;
        queueMicrotask(() => {
          void this.cargarPerfil(userId).catch((error: unknown) => this.registrarError(error));
        });
      }
    });
    this.inicializacion = this.restaurarSesion();
  }

  esperarInicializacion(): Promise<void> {
    return this.inicializacion;
  }

  iniciarSesion(cedula: string, password: string): Promise<Usuario> {
    return this.ejecutar(async () => {
      const cedulaNormalizada = cedula.trim();
      if (!/^\d{10}$/.test(cedulaNormalizada)) {
        throw new Error('La cédula debe tener 10 dígitos.');
      }

      const { data: correo, error: errorResolucion } = await this.supabase.client.rpc('obtener_correo_por_cedula', {
        p_cedula: cedulaNormalizada,
      });
      if (errorResolucion) {
        throw errorResolucion;
      }
      if (typeof correo !== 'string' || correo.length === 0) {
        throw new Error('No se encontró una cuenta asociada a esa cédula.');
      }

      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email: correo,
        password,
      });
      if (error) {
        throw error;
      }

      this.sesion.set(data.session);
      return this.cargarPerfil(data.user.id);
    });
  }

  cambiarPasswordInicial(nuevaPassword: string): Promise<void> {
    return this.ejecutar(async () => {
      if (!this.sesion()) {
        throw new Error('Debes iniciar sesión para cambiar la clave.');
      }
      if (nuevaPassword === PASSWORD_INICIAL) {
        throw new Error('La nueva clave no puede ser la clave inicial.');
      }

      const { error: errorActualizacion } = await this.supabase.client.auth.updateUser({
        password: nuevaPassword,
      });
      if (errorActualizacion) {
        throw errorActualizacion;
      }

      const { error: errorPerfil } = await this.supabase.client.rpc('marcar_password_cambiada');
      if (errorPerfil) {
        throw errorPerfil;
      }

      const perfilActual = this.perfil();
      if (perfilActual) {
        this.perfil.set({ ...perfilActual, debe_cambiar_password: false });
      }
    });
  }

  recuperarPasswordPorCorreo(correo: string): Promise<void> {
    return this.ejecutar(async () => {
      const { error } = await this.supabase.client.auth.resetPasswordForEmail(correo.trim());
      if (error) {
        throw error;
      }
    });
  }

  cerrarSesion(): Promise<void> {
    return this.ejecutar(async () => {
      const { error } = await this.supabase.client.auth.signOut();
      if (error) {
        throw error;
      }
    });
  }

  private async cargarPerfil(userId: string): Promise<Usuario> {
    const { data, error } = await this.supabase.client
      .from('perfiles_usuario')
      .select('id, cedula, rol, debe_cambiar_password, recinto_id, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }
    if (!this.esUsuario(data)) {
      throw new Error('El perfil de usuario recibido no tiene un formato válido.');
    }

    if (this.sesion()?.user.id === userId) {
      this.perfil.set(data);
    }
    return data;
  }

  private async restaurarSesion(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client.auth.getSession();
      if (error) {
        throw error;
      }

      this.sesion.set(data.session);
      if (data.session) {
        await this.cargarPerfil(data.session.user.id);
      } else {
        this.perfil.set(null);
      }
    } catch (error) {
      this.registrarError(error);
      this.sesion.set(null);
      this.perfil.set(null);
    } finally {
      this.sesionInicializada.set(true);
    }
  }

  private esUsuario(value: unknown): value is Usuario {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const perfil = value as Record<string, unknown>;
    return (
      typeof perfil['id'] === 'string' &&
      typeof perfil['cedula'] === 'string' &&
      typeof perfil['rol'] === 'string' &&
      ROLES_USUARIO.includes(perfil['rol'] as RolUsuario) &&
      typeof perfil['debe_cambiar_password'] === 'boolean' &&
      (typeof perfil['recinto_id'] === 'string' || perfil['recinto_id'] === null) &&
      typeof perfil['created_at'] === 'string'
    );
  }

  private async ejecutar<T>(accion: () => Promise<T>): Promise<T> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      return await accion();
    } catch (error) {
      this.registrarError(error);
      throw error;
    } finally {
      this.cargando.set(false);
    }
  }

  private registrarError(error: unknown): void {
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
      this.error.set(error.message);
      return;
    }
    this.error.set('Ocurrió un error al procesar la solicitud.');
  }
}
