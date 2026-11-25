import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput, IonItem, IonNote, IonSpinner, IonText } from '@ionic/angular';

import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { nuevaPasswordValidator } from '../../../shared/validators/nueva-password.validator';

const passwordsCoincidenValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const nuevaPassword: unknown = control.get('nuevaPassword')?.value;
  const confirmarPassword: unknown = control.get('confirmarPassword')?.value;
  return nuevaPassword === confirmarPassword ? null : { passwordsNoCoinciden: true };
};

@Component({
  selector: 'app-cambiar-password-page',
  standalone: true,
  templateUrl: './cambiar-password.page.html',
  styleUrl: './cambiar-password.page.scss',
  imports: [IonButton, IonContent, IonInput, IonItem, IonNote, IonSpinner, IonText, ReactiveFormsModule],
})
export class CambiarPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group(
    {
      nuevaPassword: ['', [Validators.required, Validators.minLength(8), nuevaPasswordValidator()]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: passwordsCoincidenValidator },
  );

  async cambiar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    try {
      await this.auth.cambiarPasswordInicial(this.form.controls.nuevaPassword.value);
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
      return;
    }

    await this.router.navigateByUrl('/home');
  }
}
