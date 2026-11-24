import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

function convertirNumero(valor: unknown): number | null {
  if ((typeof valor !== 'number' && typeof valor !== 'string') || (typeof valor === 'string' && valor.trim() === '')) {
    return null;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function cuadreActaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const votos: unknown = control.get('votos_organizaciones')?.value;
    const blancos = convertirNumero(control.get('blancos')?.value);
    const nulos = convertirNumero(control.get('nulos')?.value);
    const totalSufragantes = convertirNumero(control.get('total_sufragantes')?.value);

    if (
      typeof votos !== 'object' ||
      votos === null ||
      Array.isArray(votos) ||
      blancos === null ||
      nulos === null ||
      totalSufragantes === null
    ) {
      return { cuadreActa: { datosInvalidos: true } };
    }

    const votosOrganizaciones = Object.values(votos);
    if (votosOrganizaciones.length !== 5) {
      return { cuadreActa: { datosInvalidos: true } };
    }

    const votosNumericos = votosOrganizaciones.map(convertirNumero);
    if (votosNumericos.some((voto) => voto === null)) {
      return { cuadreActa: { datosInvalidos: true } };
    }

    const sumaVotos = votosNumericos.reduce<number>((suma, voto) => suma + (voto ?? 0), 0) + blancos + nulos;

    return sumaVotos === totalSufragantes
      ? null
      : {
          cuadreActa: {
            sumaVotos,
            totalSufragantes,
          },
        };
  };
}
