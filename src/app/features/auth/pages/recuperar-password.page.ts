import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonItem, IonNote, IonSpinner, IonText } from '@ionic/angular';

import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-recuperar-password-page',
  standalone: true,
  templateUrl: './recuperar-password.page.html',
  styleUrl: './recuperar-password.page.scss',
  imports: [IonButton, IonContent, IonInput, IonItem, IonNote, IonSpinner, IonText, ReactiveFormsModule, RouterLink],
})
export class RecuperarPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly error = signal<string | null>(null);
  readonly enviado = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  async recuperar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.enviado.set(false);
    try {
      await this.auth.recuperarPasswordPorCorreo(this.form.controls.correo.value);
      this.enviado.set(true);
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    }
  }
}
