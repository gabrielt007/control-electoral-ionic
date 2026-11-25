import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { cedulaEcuatorianaValidator } from '../../../shared/validators/cedula-ecuatoriana.validator';
import { RecintoService } from '../services/recinto.service';

@Component({
  selector: 'app-crear-veedor-page',
  standalone: true,
  templateUrl: './crear-veedor.page.html',
  styleUrl: './crear-veedor.page.scss',
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class CrearVeedorPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly recintoService = inject(RecintoService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    cedula: ['', [Validators.required, cedulaEcuatorianaValidator()]],
    correo: ['', [Validators.required, Validators.email]],
  });

  async crearCuenta(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.mensaje.set(null);
    this.guardando.set(true);
    try {
      const { cedula, correo } = this.form.getRawValue();
      const veedor = await this.recintoService.crearCuentaVeedor(cedula, correo);
      this.mensaje.set(
        `Cuenta creada para la cédula ${veedor.cedula}. La clave inicial es Ecuador2026 y deberá cambiarse al ingresar.`,
      );
      this.form.reset();
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.guardando.set(false);
    }
  }
}
