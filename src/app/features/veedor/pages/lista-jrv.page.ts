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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import type { JrvAsignada } from '../services/veedor.service';
import { VeedorService } from '../services/veedor.service';

@Component({
  selector: 'app-lista-jrv-page',
  standalone: true,
  templateUrl: './lista-jrv.page.html',
  styleUrl: './lista-jrv.page.scss',
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
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class ListaJrvPage implements OnInit {
  private readonly veedorService = inject(VeedorService);
  private readonly errorHandler = inject(ErrorHandlerService);

  readonly jrvs = signal<JrvAsignada[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly dignidades = [
    { codigo: 'ALCALDIA' as const, nombre: 'Alcaldía' },
    { codigo: 'PREFECTURA' as const, nombre: 'Prefectura' },
  ];

  ngOnInit(): void {
    void this.cargarJrvs();
  }

  private async cargarJrvs(): Promise<void> {
    this.error.set(null);
    this.cargando.set(true);
    try {
      this.jrvs.set(await this.veedorService.listarJrvAsignadas());
    } catch (error) {
      this.error.set(this.errorHandler.traducir(error));
      await this.errorHandler.mostrarError(error);
    } finally {
      this.cargando.set(false);
    }
  }
}
