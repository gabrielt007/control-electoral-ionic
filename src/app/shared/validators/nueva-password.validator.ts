import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function nuevaPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === 'Ecuador2026' ? { nuevaPassword: true } : null;
}
