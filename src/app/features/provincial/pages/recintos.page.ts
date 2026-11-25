import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type { DignidadElectoral } from '../../../core/models/acta.model';
import type { Recinto } from '../../../core/models/recinto.model';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { cedulaEcuatorianaValidator } from '../../../shared/validators/cedula-ecuatoriana.validator';
import type { RecintoProgreso } from '../services/provincial.service';
import { ProvincialService } from '../services/provincial.service';

const textoNoVacioValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { textoNoVacio: true };

const enteroPositivoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (control.value === null || control.value === '') {
    return null;
  }
  const cantidad = Number(control.value);
  return Number.isInteger(cantidad) && cantidad > 0 ? null : { enteroPositivo: true };
};

@Component({
  selector: 'app-recintos-page',
  standalone: true,
  templateUrl: './recintos.page.html',
  styleUrl: './recintos.page.scss',
  imports: [
    DatePipe,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class RecintosPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly provincialService = inject(ProvincialService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly recintos = signal<RecintoProgreso[]>([]);
  readonly cargando = signal(true);
  readonly guardandoRecinto = signal(false);
  readonly guardandoCoordinador = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly recintosSinCoordinador = computed(() => this.recintos().filter((recinto) => !recinto.coordinador));
  readonly dignidades: { codigo: DignidadElectoral; nombre: string }[] = [
    { codigo: 'ALCALDIA', nombre: 'Alcaldía' },
    { codigo: 'PREFECTURA', nombre: 'Prefectura' },
  ];

  readonly recintoForm = this.formBuilder.nonNullable.group({
    provincia: ['', [Validators.required, textoNoVacioValidator]],
    canton: ['', [Validators.required, textoNoVacioValidator]],
    parroquia: ['', [Validators.required, textoNoVacioValidator]],
    nombre: ['', [Validators.required, textoNoVacioValidator]],
    cantidadJrv: new FormControl<number | null>(1, [Validators.required, Validators.min(1), enteroPositivoValidator]),
  });

  readonly coordinadorForm = this.formBuilder.nonNullable.group({
    recintoId: ['', Validators.required],
    cedula: ['', [Validators.required, cedulaEcuatorianaValidator()]],
    correo: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    void this.cargarRecintos();
  }

  async cerrarSesion(): Promise<void> {
    try {
      await this.auth.cerrarSesion();
      await this.router.navigateByUrl('/auth/login');
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    }
  }

  async crearRecinto(): Promise<void> {
    if (this.recintoForm.invalid) {
      this.recintoForm.markAllAsTouched();
      return;
    }

    const valores = this.recintoForm.getRawValue();
    this.error.set(null);
    this.mensaje.set(null);
    this.guardandoRecinto.set(true);
    try {
      const recinto = await this.provincialService.crearRecinto({
        provincia: valores.provincia,
        canton: valores.canton,
        parroquia: valores.parroquia,
        nombre: valores.nombre,
        cantidadJrv: Number(valores.cantidadJrv),
      });
      this.recintoForm.reset();
      this.mensaje.set(`Recinto "${recinto.nombre}" creado con ${recinto.cantidad_jrv} JRV.`);
      await this.cargarRecintos();
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.guardandoRecinto.set(false);
    }
  }

  async crearCoordinador(): Promise<void> {
    if (this.coordinadorForm.invalid) {
      this.coordinadorForm.markAllAsTouched();
      return;
    }

    const valores = this.coordinadorForm.getRawValue();
    const recinto = this.recintosSinCoordinador().find((item) => item.id === valores.recintoId);
    if (!recinto) {
      this.error.set('Selecciona un recinto que todavía no tenga coordinador.');
      return;
    }

    this.error.set(null);
    this.mensaje.set(null);
    this.guardandoCoordinador.set(true);
    try {
      const coordinador = await this.provincialService.crearCoordinador(
        valores.cedula,
        valores.correo,
        valores.recintoId,
      );
      this.coordinadorForm.reset();
      this.mensaje.set(
        `Coordinador ${coordinador.cedula} asignado a "${recinto.nombre}". La clave inicial es Ecuador2026 y deberá cambiarse al ingresar.`,
      );
      await this.cargarRecintos();
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.guardandoCoordinador.set(false);
    }
  }

  porcentajeAvance(recinto: RecintoProgreso): number {
    if (recinto.actasEsperadas === 0) {
      return 0;
    }
    return Math.round((recinto.actasRegistradas / recinto.actasEsperadas) * 100);
  }

  nombreCoordinador(recinto: Recinto): string {
    return this.recintos().find((item) => item.id === recinto.id)?.coordinador?.cedula ?? 'Pendiente';
  }

  private async cargarRecintos(): Promise<void> {
    this.cargando.set(true);
    try {
      this.recintos.set(await this.provincialService.listarRecintosConAvance());
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.cargando.set(false);
    }
  }
}
