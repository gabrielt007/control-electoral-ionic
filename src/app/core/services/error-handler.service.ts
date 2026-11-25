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
      camera_permission_denied: 'Permite el acceso a la cámara en los ajustes del dispositivo.',
      location_permission_denied: 'Permite el acceso a la ubicación en los ajustes del dispositivo.',
      camera_cancelled: 'Se canceló la captura de la foto.',
      camera_unavailable: 'No se pudo acceder a la cámara. Verifica que esté disponible.',
      gps_unavailable: 'No se pudo obtener la ubicación. Verifica que el GPS esté activo.',
      location_timeout: 'No se obtuvo la ubicación a tiempo. Inténtalo nuevamente.',
      photo_too_blurry: 'La foto está borrosa. Toma otra foto con mejor nitidez.',
      sharpness_analysis_failed: 'No se pudo analizar la foto. Inténtalo nuevamente.',
      perfil_veedor_requerido: 'Inicia sesión con una cuenta de veedor para continuar.',
      jrv_no_asignada: 'Esta JRV no está asignada a tu usuario.',
      organizaciones_invalidas: 'No se pudo cargar la lista de organizaciones políticas.',
      votos_invalidos: 'Revisa los votos ingresados por organización política.',
      acta_descuadrada: 'La suma de los votos debe coincidir con el total de sufragantes.',
      recinto_no_encontrado: 'No se pudo encontrar el recinto de la mesa asignada.',
      foto_no_legible: 'No se pudo leer la foto capturada.',
      formato_foto_invalido: 'La foto debe estar en formato JPEG o PNG.',
      acta_y_limpieza_fallidas: 'No se guardó el acta y hubo un problema al retirar la foto temporal.',
      acta_respuesta_invalida: 'El servidor devolvió datos de acta no válidos.',
      respuesta_invalida: 'El servidor devolvió datos con un formato inválido.',
      bucketnotfound: 'No está configurado el almacenamiento de fotos de actas.',
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
