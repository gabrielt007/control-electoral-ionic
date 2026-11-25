import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import type { DignidadElectoral } from '../../../core/models/acta.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import type { VotosCandidatoRecinto } from '../services/provincial.service';
import { ProvincialService } from '../services/provincial.service';

interface ResultadoCandidato {
  candidatoId: string;
  candidatoNombre: string;
  dignidad: DignidadElectoral;
  organizacionCodigo: string;
  organizacionNombre: string;
  votos: number;
}

@Component({
  selector: 'app-votos-provincial-page',
  standalone: true,
  templateUrl: './votos.page.html',
  styleUrl: './votos.page.scss',
  imports: [
    DecimalPipe,
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonHeader,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class VotosProvincialPage implements OnInit {
  private readonly provincialService = inject(ProvincialService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly filas = signal<VotosCandidatoRecinto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtroRecinto = signal('');
  readonly filtroDignidad = signal<'TODAS' | DignidadElectoral>('TODAS');

  readonly recintos = computed(() => {
    const recintosPorId = new Map<string, string>();
    for (const fila of this.filas()) {
      recintosPorId.set(fila.recintoId, fila.recintoNombre);
    }
    return [...recintosPorId.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly resultados = computed<ResultadoCandidato[]>(() => {
    const agrupados = new Map<string, ResultadoCandidato>();
    for (const fila of this.filas()) {
      if (this.filtroRecinto() && fila.recintoId !== this.filtroRecinto()) {
        continue;
      }
      if (this.filtroDignidad() !== 'TODAS' && fila.dignidad !== this.filtroDignidad()) {
        continue;
      }

      const resultado = agrupados.get(fila.candidatoId);
      if (resultado) {
        resultado.votos += fila.votos;
      } else {
        agrupados.set(fila.candidatoId, {
          candidatoId: fila.candidatoId,
          candidatoNombre: fila.candidatoNombre,
          dignidad: fila.dignidad,
          organizacionCodigo: fila.organizacionCodigo,
          organizacionNombre: fila.organizacionNombre,
          votos: fila.votos,
        });
      }
    }
    return [...agrupados.values()].sort(
      (a, b) => a.dignidad.localeCompare(b.dignidad) || a.candidatoNombre.localeCompare(b.candidatoNombre),
    );
  });

  readonly votosTotales = computed(() => this.resultados().reduce((total, resultado) => total + resultado.votos, 0));

  ngOnInit(): void {
    void this.cargarVotos();
  }

  cambiarRecinto(event: CustomEvent<{ value: string }>): void {
    this.filtroRecinto.set(event.detail.value);
  }

  cambiarDignidad(event: CustomEvent<{ value: string }>): void {
    const valor = event.detail.value;
    if (valor === 'TODAS' || valor === 'ALCALDIA' || valor === 'PREFECTURA') {
      this.filtroDignidad.set(valor);
    }
  }

  private async cargarVotos(): Promise<void> {
    this.error.set(null);
    this.cargando.set(true);
    try {
      this.filas.set(await this.provincialService.obtenerVotosConsolidados());
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.cargando.set(false);
    }
  }
}
