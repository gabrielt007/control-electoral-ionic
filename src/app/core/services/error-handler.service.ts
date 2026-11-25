import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private readonly toastController = inject(ToastController);

  async mostrarError(error: unknown): Promise<void> {
    const toast = await this.toastController.create({
      message: this.traducir(error),
      duration: 4500,
      position: 'top',
      color: 'danger',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    await toast.present();
  }

  traducir(error: unknown): string {
    const detalles = this.obtenerDetalles(error);
    const codigo = detalles.codigo.toLowerCase().replace(/[\s-]/g, '_');
    const mensaje = detalles.mensaje.toLowerCase();

    const mensajesPorCodigo: Record<string, string> = {
      invalid_credentials: 'La cédula o la clave no son correctas.',
      email_not_confirmed: 'Debes confirmar tu correo antes de iniciar sesión.',
      email_address_invalid: 'Ingresa un correo electrónico válido.',
      user_not_found: 'No encontramos una cuenta asociada a esos datos.',
      weak_password: 'La clave no cumple los requisitos mínimos de seguridad.',
      same_password: 'La nueva clave debe ser distinta de la anterior.',
      over_email_send_rate_limit: 'Se enviaron demasiados correos. Inténtalo más tarde.',
      over_request_rate_limit: 'Hay demasiadas solicitudes. Inténtalo más tarde.',
      otp_expired: 'El enlace expiró. Solicita uno nuevo.',
      '401': 'Tu sesión expiró. Inicia sesión nuevamente.',
      '403': 'No tienes permiso para realizar esta acción.',
      '429': 'Hay demasiadas solicitudes. Inténtalo más tarde.',
      '42501': 'No tienes permiso para realizar esta acción.',
      pgrst116: 'No se encontró la información solicitada.',
      permission_denied: 'Revisa los permisos de la aplicación e inténtalo nuevamente.',
      user_cancelled: 'La operación fue cancelada.',
      user_canceled: 'La operación fue cancelada.',
      not_available: 'Esta función no está disponible en este dispositivo.',
      unavailable: 'Esta función no está disponible en este dispositivo.',
      timeout: 'La operación tardó demasiado. Inténtalo nuevamente.',
    };

    const traducido = mensajesPorCodigo[codigo];
    if (traducido) {
      return traducido;
    }

    if (codigo.includes('permission') || mensaje.includes('permission')) {
      return 'Revisa los permisos de la aplicación e inténtalo nuevamente.';
    }
    if (
      codigo.includes('cancelled') ||
      codigo.includes('canceled') ||
      mensaje.includes('cancelled') ||
      mensaje.includes('canceled')
    ) {
      return 'La operación fue cancelada.';
    }
    if (
      codigo.includes('unavailable') ||
      codigo.includes('notavailable') ||
      mensaje.includes('not implemented') ||
      mensaje.includes('not available')
    ) {
      return 'Esta función no está disponible en este dispositivo.';
    }
    if (
      codigo.includes('timeout') ||
      mensaje.includes('network') ||
      mensaje.includes('failed to fetch') ||
      mensaje.includes('fetch failed')
    ) {
      return 'No se pudo conectar. Verifica tu conexión e inténtalo nuevamente.';
    }

    return 'No se pudo completar la operación. Inténtalo nuevamente.';
  }

  private obtenerDetalles(error: unknown): { codigo: string; mensaje: string } {
    if (typeof error === 'string') {
      return { codigo: '', mensaje: error };
    }
    if (typeof error !== 'object' || error === null) {
      return { codigo: '', mensaje: '' };
    }

    const detalle = error as Record<string, unknown>;
    return {
      codigo:
        (typeof detalle['code'] === 'string' && detalle['code']) ||
        (typeof detalle['status'] === 'number' ? String(detalle['status']) : ''),
      mensaje: typeof detalle['message'] === 'string' ? detalle['message'] : '',
    };
  }
}
