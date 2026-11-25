import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormControl, FormGroup, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type { DignidadElectoral } from '../../../core/models/acta.model';
import { CameraGpsService } from '../../../core/services/camera-gps.service';
import type { CapturaCamaraGps } from '../../../core/services/camera-gps.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { cuadreActaValidator } from '../../../shared/validators/cuadre-acta.validator';
import type { ContextoActa } from '../services/veedor.service';
import { VeedorService } from '../services/veedor.service';

const enteroNoNegativoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (control.value === null || control.value === '') {
    return null;
  }
  const numero = Number(control.value);
  return Number.isInteger(numero) && numero >= 0 ? null : { enteroNoNegativo: true };
};

function esDignidad(value: string | null): value is DignidadElectoral {
  return value === 'ALCALDIA' || value === 'PREFECTURA';
}

@Component({
  selector: 'app-acta-page',
  standalone: true,
  templateUrl: './acta.page.html',
  styleUrl: './acta.page.scss',
  imports: [
    DecimalPipe,
    IonButton,
    IonCard,
    IonCardContent,
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
export class ActaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly veedorService = inject(VeedorService);
  private readonly cameraGps = inject(CameraGpsService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly contexto = signal<ContextoActa | null>(null);
  readonly captura = signal<CapturaCamaraGps | null>(null);
  readonly cargando = signal(true);
  readonly capturando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly form = new FormGroup(
    {
      votos_organizaciones: new FormRecord<FormControl<number | null>>({}),
      blancos: new FormControl<number | null>(0, [Validators.required, enteroNoNegativoValidator]),
      nulos: new FormControl<number | null>(0, [Validators.required, enteroNoNegativoValidator]),
      total_sufragantes: new FormControl<number | null>(0, [Validators.required, enteroNoNegativoValidator]),
    },
    { validators: cuadreActaValidator() },
  );

  ngOnInit(): void {
    void this.cargarContexto();
  }

  async tomarFoto(): Promise<void> {
    this.error.set(null);
    this.mensaje.set(null);
    this.aviso.set(null);
    this.capturando.set(true);
    try {
      this.captura.set(await this.cameraGps.capturarFotoConUbicacion());
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.capturando.set(false);
    }
  }

  async guardar(): Promise<void> {
    const contexto = this.contexto();
    const captura = this.captura();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!contexto || !captura) {
      this.error.set('Captura una foto nítida con ubicación antes de guardar el acta.');
      return;
    }

    const valores = this.form.getRawValue();
    this.error.set(null);
    this.mensaje.set(null);
    this.aviso.set(null);
    this.guardando.set(true);
    try {
      const resultado = await this.veedorService.guardarActa({
        jrvId: contexto.jrv.id,
        dignidad: contexto.dignidad,
        votosOrganizaciones: Object.fromEntries(
          Object.entries(valores.votos_organizaciones).map(([id, votos]) => [id, Number(votos)]),
        ),
        blancos: Number(valores.blancos),
        nulos: Number(valores.nulos),
        totalSufragantes: Number(valores.total_sufragantes),
        captura,
      });
      this.contexto.set({ ...contexto, acta: resultado.acta });
      this.captura.set(null);
      this.mensaje.set('El acta se guardó correctamente.');
      this.aviso.set(resultado.avisoLimpieza);
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargarContexto(): Promise<void> {
    const jrvId = this.route.snapshot.paramMap.get('jrvId');
    const dignidad = this.route.snapshot.paramMap.get('dignidad');
    if (!jrvId || !esDignidad(dignidad)) {
      this.error.set('La JRV o dignidad solicitada no es válida.');
      this.cargando.set(false);
      return;
    }

    try {
      const contexto = await this.veedorService.obtenerContextoActa(jrvId, dignidad);
      this.contexto.set(contexto);
      for (const organizacion of contexto.organizaciones) {
        this.form.controls.votos_organizaciones.addControl(
          organizacion.id,
          new FormControl<number | null>(0, [Validators.required, enteroNoNegativoValidator]),
        );
      }

      const votosExistentes = contexto.acta?.votos_organizaciones ?? {};
      for (const organizacion of contexto.organizaciones) {
        this.form.controls.votos_organizaciones.controls[organizacion.id].setValue(
          votosExistentes[organizacion.id] ?? 0,
          { emitEvent: false },
        );
      }
      this.form.patchValue(
        {
          blancos: contexto.acta?.blancos ?? 0,
          nulos: contexto.acta?.nulos ?? 0,
          total_sufragantes: contexto.acta?.total_sufragantes ?? 0,
        },
        { emitEvent: false },
      );
      this.form.updateValueAndValidity();
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.cargando.set(false);
    }
  }
}
