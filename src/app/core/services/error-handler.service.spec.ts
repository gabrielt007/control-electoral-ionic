import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';

import { ErrorHandlerService } from './error-handler.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  const present = vi.fn();
  const create = vi.fn().mockResolvedValue({ present });

  beforeEach(() => {
    present.mockClear();
    create.mockClear();
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        {
          provide: ToastController,
          useValue: { create },
        },
      ],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('translates Supabase authentication errors into friendly messages', () => {
    expect(service.traducir({ code: 'invalid_credentials' })).toBe('La cédula o la clave no son correctas.');
  });

  it('translates Capacitor permission errors without exposing plugin details', () => {
    expect(service.traducir({ code: 'CameraPermissionDenied' })).toBe(
      'Revisa los permisos de la aplicación e inténtalo nuevamente.',
    );
  });

  it('uses a friendly fallback for unknown errors', () => {
    expect(service.traducir(new Error('internal stack trace'))).toBe(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
  });

  it('presents a toast with the translated message', async () => {
    await service.mostrarError({ code: 'invalid_credentials' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ message: 'La cédula o la clave no son correctas.' }));
    expect(present).toHaveBeenCalled();
  });
});
