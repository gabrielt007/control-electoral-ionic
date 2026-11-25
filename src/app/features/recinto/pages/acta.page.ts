import { Component, inject, signal } from '@angular/core';
import type { OnDestroy, OnInit } from '@angular/core';
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
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { cuadreActaValidator } from '../../../shared/validators/cuadre-acta.validator';
import type { ContextoCorreccionActa, ResultadoCorreccionActa } from '../services/recinto.service';
import { RecintoService } from '../services/recinto.service';

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
  selector: 'app-acta-recinto-page',
  standalone: true,
  templateUrl: './acta.page.html',
  styleUrl: './acta.page.scss',
  imports: [
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
export class ActaRecintoPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly recintoService = inject(RecintoService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private fotoPreviewCreada: string | null = null;

  readonly contexto = signal<ContextoCorreccionActa | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly fotoSeleccionada = signal<File | null>(null);
  readonly fotoPreviewUrl = signal<string | null>(null);
  readonly fotoFirmada = signal<string | null>(null);
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
    void this.cargarActa();
  }

  ngOnDestroy(): void {
    this.liberarFotoPreview();
  }

  seleccionarFoto(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const foto = input.files?.[0] ?? null;
    input.value = '';
    if (foto && foto.type !== 'image/jpeg' && foto.type !== 'image/png') {
      this.error.set('La foto debe estar en formato JPEG o PNG.');
      this.liberarFotoPreview();
      this.fotoSeleccionada.set(null);
      return;
    }
    if (foto && (foto.size <= 0 || foto.size > 10 * 1024 * 1024)) {
      this.error.set('La foto debe tener un tamaño máximo de 10 MB.');
      this.liberarFotoPreview();
      this.fotoSeleccionada.set(null);
      return;
    }

    this.error.set(null);
    this.mensaje.set(null);
    this.liberarFotoPreview();
    this.fotoSeleccionada.set(foto);
    if (foto) {
      this.fotoPreviewCreada = URL.createObjectURL(foto);
      this.fotoPreviewUrl.set(this.fotoPreviewCreada);
    }
  }

  async guardar(): Promise<void> {
    const contexto = this.contexto();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!contexto) {
      return;
    }

    const valores = this.form.getRawValue();
    this.error.set(null);
    this.mensaje.set(null);
    this.aviso.set(null);
    this.guardando.set(true);
    try {
      const resultado = await this.recintoService.guardarCorreccionActa({
        jrvId: contexto.mesa.id,
        dignidad: contexto.dignidad,
        votosOrganizaciones: Object.fromEntries(
          Object.entries(valores.votos_organizaciones).map(([id, votos]) => [id, Number(votos)]),
        ),
        blancos: Number(valores.blancos),
        nulos: Number(valores.nulos),
        totalSufragantes: Number(valores.total_sufragantes),
        foto: this.fotoSeleccionada(),
      });
      this.actualizarContexto(contexto, resultado);
      this.mensaje.set('La corrección del acta se guardó correctamente.');
      this.aviso.set(resultado.aviso);
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargarActa(): Promise<void> {
    const jrvId = this.route.snapshot.paramMap.get('jrvId');
    const dignidad = this.route.snapshot.paramMap.get('dignidad');
    if (!jrvId || !esDignidad(dignidad)) {
      this.error.set('La mesa o dignidad solicitada no es válida.');
      this.cargando.set(false);
      return;
    }

    try {
      const contexto = await this.recintoService.obtenerActaParaCorreccion(jrvId, dignidad);
      this.contexto.set(contexto);
      this.fotoFirmada.set(contexto.fotoFirmada);
      for (const organizacion of contexto.organizaciones) {
        this.form.controls.votos_organizaciones.addControl(
          organizacion.id,
          new FormControl<number | null>(0, [Validators.required, enteroNoNegativoValidator]),
        );
      }

      for (const organizacion of contexto.organizaciones) {
        this.form.controls.votos_organizaciones.controls[organizacion.id].setValue(
          contexto.acta.votos_organizaciones[organizacion.id] ?? 0,
          { emitEvent: false },
        );
      }
      this.form.patchValue(
        {
          blancos: contexto.acta.blancos,
          nulos: contexto.acta.nulos,
          total_sufragantes: contexto.acta.total_sufragantes,
        },
        { emitEvent: false },
      );
      this.form.updateValueAndValidity();
      this.aviso.set(contexto.avisoFoto);
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.cargando.set(false);
    }
  }

  private actualizarContexto(contexto: ContextoCorreccionActa, resultado: ResultadoCorreccionActa): void {
    this.contexto.set({ ...contexto, acta: resultado.acta, fotoFirmada: resultado.fotoFirmada });
    this.fotoFirmada.set(resultado.fotoFirmada);
    this.fotoSeleccionada.set(null);
    this.liberarFotoPreview();
  }

  private liberarFotoPreview(): void {
    if (this.fotoPreviewCreada) {
      URL.revokeObjectURL(this.fotoPreviewCreada);
      this.fotoPreviewCreada = null;
    }
    this.fotoPreviewUrl.set(null);
  }
}
