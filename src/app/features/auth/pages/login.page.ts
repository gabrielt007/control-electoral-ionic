import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonItem, IonNote, IonSpinner, IonText } from '@ionic/angular';

import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { cedulaEcuatorianaValidator } from '../../../shared/validators/cedula-ecuatoriana.validator';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  imports: [IonButton, IonContent, IonInput, IonItem, IonNote, IonSpinner, IonText, ReactiveFormsModule, RouterLink],
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    cedula: ['', [Validators.required, cedulaEcuatorianaValidator()]],
    password: ['', Validators.required],
  });

  async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    let rutaDestino: string;
    try {
      const { cedula, password } = this.form.getRawValue();
      const perfil = await this.auth.iniciarSesion(cedula, password);
      rutaDestino = perfil.debe_cambiar_password
        ? '/auth/cambiar-password'
        : perfil.rol === 'VEEDOR'
          ? '/veedor'
          : perfil.rol === 'RECINTO'
            ? '/recinto'
            : '/home';
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
      return;
    }

    await this.router.navigateByUrl(rutaDestino);
  }
}
