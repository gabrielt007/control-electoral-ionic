import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cedulaEcuatorianaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cedula: unknown = control.value;
    if (cedula === null || cedula === undefined || cedula === '') {
      return null;
    }

    if (typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) {
      return { cedulaEcuatoriana: true };
    }

    const provincia = Number(cedula.slice(0, 2));
    const tercerDigito = Number(cedula[2]);
    if (provincia < 1 || provincia > 24 || tercerDigito >= 6) {
      return { cedulaEcuatoriana: true };
    }

    const suma = [...cedula.slice(0, 9)].reduce((total, digito, indice) => {
      const producto = Number(digito) * (indice % 2 === 0 ? 2 : 1);
      return total + (producto > 9 ? producto - 9 : producto);
    }, 0);
    const digitoVerificador = (10 - (suma % 10)) % 10;

    return digitoVerificador === Number(cedula[9]) ? null : { cedulaEcuatoriana: true };
  };
}
