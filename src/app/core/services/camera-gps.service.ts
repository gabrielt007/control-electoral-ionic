import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const TAMANO_MAXIMO_ANALISIS = 640;
export const UMBRAL_NITIDEZ_MINIMO = 100;

export type CameraGpsErrorCode =
  | 'CAMERA_PERMISSION_DENIED'
  | 'LOCATION_PERMISSION_DENIED'
  | 'CAMERA_CANCELLED'
  | 'CAMERA_UNAVAILABLE'
  | 'GPS_UNAVAILABLE'
  | 'LOCATION_TIMEOUT'
  | 'PHOTO_TOO_BLURRY'
  | 'SHARPNESS_ANALYSIS_FAILED';

export class CameraGpsError extends Error {
  constructor(
    readonly code: CameraGpsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CameraGpsError';
  }
}

export interface CapturaCamaraGps {
  fotoUri: string | null;
  fotoWebPath: string;
  latitud: number;
  longitud: number;
  precisionGps: number;
  nitidez: number;
}

@Injectable({
  providedIn: 'root',
})
export class CameraGpsService {
  async capturarFotoConUbicacion(): Promise<CapturaCamaraGps> {
    await this.asegurarPermisoCamara();
    await this.asegurarPermisoUbicacion();

    const foto = await Camera.takePhoto({
      quality: 95,
      correctOrientation: true,
      saveToGallery: false,
      editable: 'no',
    }).catch((error: unknown) => {
      throw this.errorDeCamara(error);
    });

    const fotoWebPath = this.obtenerRutaWeb(foto);
    const nitidez = await this.calcularNitidez(fotoWebPath);
    this.validarNitidez(nitidez);

    const posicion = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    }).catch((error: unknown) => {
      throw this.errorDeUbicacion(error);
    });

    return {
      fotoUri: foto.uri ?? null,
      fotoWebPath,
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      precisionGps: posicion.coords.accuracy,
      nitidez,
    };
  }

  async calcularNitidez(fotoWebPath: string): Promise<number> {
    if (typeof document === 'undefined') {
      throw new CameraGpsError('SHARPNESS_ANALYSIS_FAILED', 'El análisis de nitidez requiere un entorno con Canvas.');
    }

    const imagen = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        imagen.onload = () => resolve();
        imagen.onerror = () =>
          reject(
            new CameraGpsError('SHARPNESS_ANALYSIS_FAILED', 'No se pudo cargar la foto para analizar su nitidez.'),
          );
        imagen.src = fotoWebPath;
      });

      const anchoOriginal = imagen.naturalWidth;
      const altoOriginal = imagen.naturalHeight;
      if (anchoOriginal < 3 || altoOriginal < 3) {
        throw new CameraGpsError(
          'SHARPNESS_ANALYSIS_FAILED',
          'La foto no tiene dimensiones suficientes para analizarse.',
        );
      }

      const escala = Math.min(1, TAMANO_MAXIMO_ANALISIS / Math.max(anchoOriginal, altoOriginal));
      const ancho = Math.max(3, Math.round(anchoOriginal * escala));
      const alto = Math.max(3, Math.round(altoOriginal * escala));
      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;

      const contexto = canvas.getContext('2d', { willReadFrequently: true });
      if (!contexto) {
        throw new CameraGpsError('SHARPNESS_ANALYSIS_FAILED', 'No se pudo iniciar el análisis local de la foto.');
      }

      contexto.drawImage(imagen, 0, 0, ancho, alto);
      const { data } = contexto.getImageData(0, 0, ancho, alto);
      return this.calcularVarianzaLaplaciano(data, ancho, alto);
    } catch (error) {
      if (error instanceof CameraGpsError) {
        throw error;
      }
      throw new CameraGpsError('SHARPNESS_ANALYSIS_FAILED', 'No se pudo analizar la nitidez de la foto.');
    }
  }

  calcularVarianzaLaplaciano(rgba: Uint8ClampedArray, ancho: number, alto: number): number {
    if (ancho < 3 || alto < 3 || rgba.length !== ancho * alto * 4) {
      throw new CameraGpsError(
        'SHARPNESS_ANALYSIS_FAILED',
        'Los datos de imagen no son válidos para analizar la nitidez.',
      );
    }

    const escalaR = 0.299;
    const escalaG = 0.587;
    const escalaB = 0.114;
    const grises = new Float32Array(ancho * alto);

    for (let pixel = 0; pixel < ancho * alto; pixel += 1) {
      const offset = pixel * 4;
      grises[pixel] = escalaR * rgba[offset] + escalaG * rgba[offset + 1] + escalaB * rgba[offset + 2];
    }

    let suma = 0;
    let sumaCuadrados = 0;
    let cantidad = 0;

    for (let y = 1; y < alto - 1; y += 1) {
      for (let x = 1; x < ancho - 1; x += 1) {
        const indice = y * ancho + x;
        const laplaciano =
          grises[indice - 1] +
          grises[indice + 1] +
          grises[indice - ancho] +
          grises[indice + ancho] -
          4 * grises[indice];
        suma += laplaciano;
        sumaCuadrados += laplaciano * laplaciano;
        cantidad += 1;
      }
    }

    const media = suma / cantidad;
    return Math.max(0, sumaCuadrados / cantidad - media * media);
  }

  validarNitidez(nitidez: number): void {
    if (!Number.isFinite(nitidez) || nitidez < UMBRAL_NITIDEZ_MINIMO) {
      throw new CameraGpsError('PHOTO_TOO_BLURRY', `La foto no tiene suficiente nitidez (${nitidez.toFixed(1)}).`);
    }
  }

  private async asegurarPermisoCamara(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const permisos = await Camera.checkPermissions();
      if (permisos.camera === 'granted') {
        return;
      }

      const resultado = await Camera.requestPermissions({ permissions: ['camera'] });
      if (resultado.camera !== 'granted') {
        throw new CameraGpsError('CAMERA_PERMISSION_DENIED', 'Se requiere permiso para usar la cámara.');
      }
    } catch (error) {
      if (error instanceof CameraGpsError) {
        throw error;
      }
      throw this.errorDeCamara(error);
    }
  }

  private async asegurarPermisoUbicacion(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const permisos = await Geolocation.checkPermissions();
      if (permisos.location === 'granted') {
        return;
      }

      const resultado = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (resultado.location !== 'granted') {
        throw new CameraGpsError('LOCATION_PERMISSION_DENIED', 'Se requiere permiso para registrar la ubicación.');
      }
    } catch (error) {
      if (error instanceof CameraGpsError) {
        throw error;
      }
      throw this.errorDeUbicacion(error);
    }
  }

  private obtenerRutaWeb(foto: { webPath?: string; uri?: string; thumbnail?: string }): string {
    if (foto.webPath) {
      return foto.webPath;
    }
    if (foto.uri) {
      return Capacitor.convertFileSrc(foto.uri);
    }
    if (foto.thumbnail) {
      return `data:image/jpeg;base64,${foto.thumbnail}`;
    }
    throw new CameraGpsError('CAMERA_UNAVAILABLE', 'La cámara no devolvió una ruta válida para la foto.');
  }

  private errorDeCamara(error: unknown): CameraGpsError {
    const { code, message } = this.obtenerDetalles(error);
    if (code.includes('0006') || message.includes('cancel')) {
      return new CameraGpsError('CAMERA_CANCELLED', 'Se canceló la captura de la foto.');
    }
    if (message.includes('permission')) {
      return new CameraGpsError('CAMERA_PERMISSION_DENIED', 'No se concedió permiso para usar la cámara.');
    }
    return new CameraGpsError('CAMERA_UNAVAILABLE', 'No se pudo acceder a la cámara.');
  }

  private errorDeUbicacion(error: unknown): CameraGpsError {
    const { code, message } = this.obtenerDetalles(error);
    if (code === '1' || message.includes('permission') || message.includes('denied')) {
      return new CameraGpsError('LOCATION_PERMISSION_DENIED', 'No se concedió permiso para registrar la ubicación.');
    }
    if (code === '3' || message.includes('timeout')) {
      return new CameraGpsError('LOCATION_TIMEOUT', 'No se obtuvo la ubicación a tiempo.');
    }
    return new CameraGpsError(
      'GPS_UNAVAILABLE',
      'No se pudo obtener la ubicación GPS. Verifica que el servicio de ubicación esté activo.',
    );
  }

  private obtenerDetalles(error: unknown): { code: string; message: string } {
    if (typeof error !== 'object' || error === null) {
      return { code: '', message: '' };
    }

    const detalle = error as Record<string, unknown>;
    return {
      code:
        (typeof detalle['code'] === 'string' && detalle['code'].toLowerCase()) ||
        (typeof detalle['code'] === 'number' ? String(detalle['code']) : ''),
      message: typeof detalle['message'] === 'string' ? detalle['message'].toLowerCase() : '',
    };
  }
}
