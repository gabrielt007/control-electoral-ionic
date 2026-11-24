import { FormControl, FormGroup } from '@angular/forms';

import { cedulaEcuatorianaValidator } from './cedula-ecuatoriana.validator';
import { cuadreActaValidator } from './cuadre-acta.validator';
import { nuevaPasswordValidator } from './nueva-password.validator';

describe('cedulaEcuatorianaValidator', () => {
  const validator = cedulaEcuatorianaValidator();

  it('accepts a valid Ecuadorian ID', () => {
    expect(validator(new FormControl('1710034065'))).toBeNull();
  });

  it.each(['123', '2510034065', '1760034065', '1710034064'])('rejects invalid ID %s', (cedula) => {
    expect(validator(new FormControl(cedula))).toEqual({
      cedulaEcuatoriana: true,
    });
  });
});

describe('cuadreActaValidator', () => {
  function crearFormulario(totalSufragantes: string): FormGroup {
    return new FormGroup({
      votos_organizaciones: new FormControl(
        { org1: '1', org2: '2', org3: '3', org4: '4', org5: '5' },
        { nonNullable: true },
      ),
      blancos: new FormControl('2', { nonNullable: true }),
      nulos: new FormControl('1', { nonNullable: true }),
      total_sufragantes: new FormControl(totalSufragantes, {
        nonNullable: true,
      }),
    });
  }

  it('converts string values to numbers and accepts a balanced tally', () => {
    expect(cuadreActaValidator()(crearFormulario('18'))).toBeNull();
  });

  it('returns the tally details when the act is not balanced', () => {
    expect(cuadreActaValidator()(crearFormulario('19'))).toEqual({
      cuadreActa: { sumaVotos: 18, totalSufragantes: 19 },
    });
  });

  it('rejects incomplete organization votes', () => {
    const form = crearFormulario('18');
    form.setControl('votos_organizaciones', new FormControl({ org1: '1', org2: '2' }, { nonNullable: true }));

    expect(cuadreActaValidator()(form)).toEqual({
      cuadreActa: { datosInvalidos: true },
    });
  });
});

describe('nuevaPasswordValidator', () => {
  const validator = nuevaPasswordValidator();

  it('rejects the initial password', () => {
    expect(validator(new FormControl('Ecuador2026'))).toEqual({
      nuevaPassword: true,
    });
  });

  it('accepts a different password', () => {
    expect(validator(new FormControl('NuevaClave2026'))).toBeNull();
  });
});
