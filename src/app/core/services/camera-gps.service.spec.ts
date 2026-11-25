import { CameraGpsService, UMBRAL_NITIDEZ_MINIMO } from './camera-gps.service';

describe('CameraGpsService', () => {
  const service = new CameraGpsService();

  it('returns zero Laplacian variance for a uniform image', () => {
    const rgba = new Uint8ClampedArray(5 * 5 * 4);
    for (let pixel = 0; pixel < 25; pixel += 1) {
      rgba.set([128, 128, 128, 255], pixel * 4);
    }

    expect(service.calcularVarianzaLaplaciano(rgba, 5, 5)).toBe(0);
  });

  it('scores sharp edges above the initial acceptance threshold', () => {
    const rgba = new Uint8ClampedArray(5 * 5 * 4);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const intensidad = (x + y) % 2 === 0 ? 255 : 0;
        rgba.set([intensidad, intensidad, intensidad, 255], (y * 5 + x) * 4);
      }
    }

    expect(service.calcularVarianzaLaplaciano(rgba, 5, 5)).toBeGreaterThan(UMBRAL_NITIDEZ_MINIMO);
  });

  it('rejects pixel buffers that do not match the given dimensions', () => {
    expect(() => service.calcularVarianzaLaplaciano(new Uint8ClampedArray(4), 3, 3)).toThrow(
      'Los datos de imagen no son válidos para analizar la nitidez.',
    );
  });

  it('rejects a photo score below the acceptance threshold', () => {
    expect(() => service.validarNitidez(UMBRAL_NITIDEZ_MINIMO - 1)).toThrow('La foto no tiene suficiente nitidez');
  });
});
