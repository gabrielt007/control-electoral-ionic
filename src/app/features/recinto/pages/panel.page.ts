import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
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
import type { MesaRecinto, PanelRecinto } from '../services/recinto.service';
import { RecintoService } from '../services/recinto.service';

@Component({
  selector: 'app-panel-recinto-page',
  standalone: true,
  templateUrl: './panel.page.html',
  styleUrl: './panel.page.scss',
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
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
export class PanelRecintoPage implements OnInit {
  private readonly recintoService = inject(RecintoService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly panel = signal<PanelRecinto | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mesaActualizando = signal<string | null>(null);
  readonly dignidades: { codigo: DignidadElectoral; nombre: string }[] = [
    { codigo: 'ALCALDIA', nombre: 'Alcaldía' },
    { codigo: 'PREFECTURA', nombre: 'Prefectura' },
  ];

  ngOnInit(): void {
    void this.cargarPanel();
  }

  async cambiarAsignacion(event: CustomEvent<{ value: string }>, mesa: MesaRecinto): Promise<void> {
    const veedorId = event.detail.value || null;
    this.error.set(null);
    this.mesaActualizando.set(mesa.id);
    try {
      await this.recintoService.asignarVeedor(mesa.id, veedorId);
      this.panel.update((panel) =>
        panel
          ? {
              ...panel,
              mesas: panel.mesas.map((actual) => (actual.id === mesa.id ? { ...actual, veedorId } : actual)),
            }
          : panel,
      );
    } catch (error) {
      this.panel.update((panel) =>
        panel
          ? {
              ...panel,
              mesas: panel.mesas.map((actual) =>
                actual.id === mesa.id ? { ...actual, veedorId: mesa.veedorId } : actual,
              ),
            }
          : panel,
      );
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.mesaActualizando.set(null);
    }
  }

  nombreVeedor(panel: PanelRecinto, veedorId: string | null): string {
    if (!veedorId) {
      return 'Sin asignar';
    }
    return panel.veedores.find((veedor) => veedor.id === veedorId)?.cedula ?? 'Veedor no disponible';
  }

  private async cargarPanel(): Promise<void> {
    this.error.set(null);
    this.cargando.set(true);
    try {
      this.panel.set(await this.recintoService.obtenerPanel());
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.cargando.set(false);
    }
  }
}
