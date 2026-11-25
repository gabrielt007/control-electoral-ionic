import { inject, Injectable } from '@angular/core';

import type { DignidadElectoral } from '../../../core/models/acta.model';
import type { Recinto } from '../../../core/models/recinto.model';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

export class ProvincialError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ProvincialError';
  }
}

export interface CoordinadorProvincial {
  id: string;
  cedula: string;
  recinto_id: string;
}

export interface ActaProgreso {
  id: string;
  latitud: number | null;
  longitud: number | null;
  updated_at: string;
}

export interface MesaProgreso {
  id: string;
  numeroMesa: number;
  actas: Partial<Record<DignidadElectoral, ActaProgreso>>;
}

export interface RecintoProgreso extends Recinto {
  coordinador: CoordinadorProvincial | null;
  mesas: MesaProgreso[];
  actasRegistradas: number;
  actasEsperadas: number;
}

export interface DatosNuevoRecinto {
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  cantidadJrv: number;
}

export interface VotosCandidatoRecinto {
  recintoId: string;
  recintoNombre: string;
  candidatoId: string;
  candidatoNombre: string;
  dignidad: DignidadElectoral;
  organizacionId: string;
  organizacionCodigo: string;
  organizacionNombre: string;
  votos: number;
}

interface JrvRow {
  id: string;
  recinto_id: string;
  numero_mesa: number;
}

interface ActaRow {
  id: string;
  jrv_id: string;
  dignidad: DignidadElectoral;
  latitud: number | null;
  longitud: number | null;
  updated_at: string;
}

const TAMANO_PAGINA = 500;

@Injectable({
  providedIn: 'root',
})
export class ProvincialService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  async listarRecintosConAvance(): Promise<RecintoProgreso[]> {
    await this.verificarRolProvincial();
    const [recintosData, coordinadoresData] = await Promise.all([
      this.cargarPaginas((inicio, fin) =>
        this.supabase.client
          .from('recintos')
          .select('id, provincia, canton, parroquia, nombre, cantidad_jrv, created_at')
          .order('provincia')
          .order('canton')
          .order('parroquia')
          .order('nombre')
          .order('id')
          .range(inicio, fin),
      ),
      this.cargarPaginas((inicio, fin) =>
        this.supabase.client
          .from('perfiles_usuario')
          .select('id, cedula, recinto_id')
          .eq('rol', 'RECINTO')
          .not('recinto_id', 'is', null)
          .order('recinto_id')
          .order('id')
          .range(inicio, fin),
      ),
    ]);

    const recintos = this.validarArray(recintosData, this.esRecinto);
    const coordinadores = this.validarArray(coordinadoresData, this.esCoordinador);
    const idsRecinto = recintos.map((recinto) => recinto.id);
    if (idsRecinto.length === 0) {
      return [];
    }

    const mesasData = await this.cargarPaginas((inicio, fin) =>
      this.supabase.client
        .from('jrv')
        .select('id, recinto_id, numero_mesa')
        .in('recinto_id', idsRecinto)
        .order('recinto_id')
        .order('numero_mesa')
        .order('id')
        .range(inicio, fin),
    );
    const mesas = this.validarArray(mesasData, this.esJrv);

    let actas: ActaRow[] = [];
    if (mesas.length > 0) {
      const actasData = await this.cargarPaginas((inicio, fin) =>
        this.supabase.client
          .from('actas')
          .select('id, jrv_id, dignidad, latitud, longitud, updated_at')
          .order('jrv_id')
          .order('dignidad')
          .order('id')
          .range(inicio, fin),
      );
      actas = this.validarArray(actasData, this.esActaRow);
    }

    const coordinadorPorRecinto = new Map<string, CoordinadorProvincial>();
    for (const coordinador of coordinadores) {
      if (coordinadorPorRecinto.has(coordinador.recinto_id)) {
        throw new ProvincialError(
          'COORDINADORES_DUPLICADOS',
          'Hay más de un coordinador asignado a un recinto. Revisa la configuración.',
        );
      }
      coordinadorPorRecinto.set(coordinador.recinto_id, coordinador);
    }

    const actasPorJrv = new Map<string, Partial<Record<DignidadElectoral, ActaProgreso>>>();
    for (const acta of actas) {
      const actasMesa = actasPorJrv.get(acta.jrv_id) ?? {};
      actasMesa[acta.dignidad] = {
        id: acta.id,
        latitud: acta.latitud,
        longitud: acta.longitud,
        updated_at: acta.updated_at,
      };
      actasPorJrv.set(acta.jrv_id, actasMesa);
    }

    const mesasPorRecinto = new Map<string, MesaProgreso[]>();
    for (const mesa of mesas) {
      const mesasRecinto = mesasPorRecinto.get(mesa.recinto_id) ?? [];
      mesasRecinto.push({
        id: mesa.id,
        numeroMesa: mesa.numero_mesa,
        actas: actasPorJrv.get(mesa.id) ?? {},
      });
      mesasPorRecinto.set(mesa.recinto_id, mesasRecinto);
    }

    return recintos.map((recinto) => {
      const mesasRecinto = mesasPorRecinto.get(recinto.id) ?? [];
      const actasRegistradas = mesasRecinto.reduce((total, mesa) => total + Object.keys(mesa.actas).length, 0);
      return {
        ...recinto,
        coordinador: coordinadorPorRecinto.get(recinto.id) ?? null,
        mesas: mesasRecinto,
        actasRegistradas,
        actasEsperadas: recinto.cantidad_jrv * 2,
      };
    });
  }

  async crearRecinto(datos: DatosNuevoRecinto): Promise<Recinto> {
    await this.verificarRolProvincial();
    const { data, error } = await this.supabase.client.rpc('crear_recinto_con_jrv', {
      p_provincia: datos.provincia.trim(),
      p_canton: datos.canton.trim(),
      p_parroquia: datos.parroquia.trim(),
      p_nombre: datos.nombre.trim(),
      p_cantidad_jrv: datos.cantidadJrv,
    });
    if (error) {
      throw error;
    }
    if (!this.esRecinto(data)) {
      throw new ProvincialError('RECINTO_RESPUESTA_INVALIDA', 'El servidor no devolvió el recinto creado.');
    }
    return data;
  }

  async crearCoordinador(cedula: string, correo: string, recintoId: string): Promise<CoordinadorProvincial> {
    await this.verificarRolProvincial();
    const { data, error } = await this.supabase.client.functions.invoke('crear-coordinador', {
      body: { cedula: cedula.trim(), correo: correo.trim().toLowerCase(), recintoId },
    });
    if (error) {
      throw await this.leerErrorFuncion(error);
    }
    if (!this.esCoordinador(data)) {
      throw new ProvincialError('RESPUESTA_INVALIDA', 'El servidor no devolvió el coordinador creado.');
    }
    return data;
  }

  async obtenerVotosConsolidados(): Promise<VotosCandidatoRecinto[]> {
    await this.verificarRolProvincial();
    const data = await this.cargarPaginas((inicio, fin) =>
      this.supabase.client
        .rpc('obtener_resumen_votos_provincial')
        .order('recinto_id')
        .order('candidato_id')
        .range(inicio, fin),
    );
    return this.validarArray(data, this.esResumenVotos).map((fila) => ({
      recintoId: fila.recinto_id,
      recintoNombre: fila.recinto_nombre,
      candidatoId: fila.candidato_id,
      candidatoNombre: fila.candidato_nombre,
      dignidad: fila.dignidad,
      organizacionId: fila.organizacion_id,
      organizacionCodigo: fila.organizacion_codigo,
      organizacionNombre: fila.organizacion_nombre,
      votos: Number(fila.votos),
    }));
  }

  private async verificarRolProvincial(): Promise<void> {
    await this.auth.esperarInicializacion();
    const sesion = this.auth.sesion();
    const perfil = this.auth.perfil();
    if (!sesion || !perfil || perfil.id !== sesion.user.id || perfil.rol !== 'PROVINCIAL') {
      throw new ProvincialError('PERFIL_PROVINCIAL_REQUERIDO', 'Se requiere una sesión provincial activa.');
    }
  }

  private async cargarPaginas(
    consultar: (inicio: number, fin: number) => PromiseLike<{ data: unknown; error: unknown | null }>,
  ): Promise<unknown[]> {
    const filas: unknown[] = [];
    for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
      const { data, error } = await consultar(inicio, inicio + TAMANO_PAGINA - 1);
      if (error) {
        throw error;
      }
      if (!Array.isArray(data)) {
        throw new ProvincialError('RESPUESTA_INVALIDA', 'El servidor devolvió datos con un formato inválido.');
      }
      filas.push(...data);
      if (data.length < TAMANO_PAGINA) {
        return filas;
      }
    }
  }

  private async leerErrorFuncion(error: unknown): Promise<unknown> {
    if (typeof error !== 'object' || error === null || !('context' in error) || !(error.context instanceof Response)) {
      return error;
    }
    try {
      const body: unknown = await error.context.clone().json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'code' in body &&
        typeof body.code === 'string' &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        return new ProvincialError(body.code, body.message);
      }
    } catch {
      return error;
    }
    return error;
  }

  private validarArray<T>(value: unknown, validar: (item: unknown) => item is T): T[] {
    if (!Array.isArray(value) || !value.every(validar)) {
      throw new ProvincialError('RESPUESTA_INVALIDA', 'El servidor devolvió datos con un formato inválido.');
    }
    return value;
  }

  private esRecinto(value: unknown): value is Recinto {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return (
      typeof row['id'] === 'string' &&
      typeof row['provincia'] === 'string' &&
      typeof row['canton'] === 'string' &&
      typeof row['parroquia'] === 'string' &&
      typeof row['nombre'] === 'string' &&
      typeof row['cantidad_jrv'] === 'number' &&
      typeof row['created_at'] === 'string'
    );
  }

  private esCoordinador(value: unknown): value is CoordinadorProvincial {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row['id'] === 'string' && typeof row['cedula'] === 'string' && typeof row['recinto_id'] === 'string';
  }

  private esJrv(value: unknown): value is JrvRow {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return (
      typeof row['id'] === 'string' && typeof row['recinto_id'] === 'string' && typeof row['numero_mesa'] === 'number'
    );
  }

  private esActaRow(value: unknown): value is ActaRow {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return (
      typeof row['id'] === 'string' &&
      typeof row['jrv_id'] === 'string' &&
      (row['dignidad'] === 'ALCALDIA' || row['dignidad'] === 'PREFECTURA') &&
      (typeof row['latitud'] === 'number' || row['latitud'] === null) &&
      (typeof row['longitud'] === 'number' || row['longitud'] === null) &&
      typeof row['updated_at'] === 'string'
    );
  }

  private esResumenVotos(value: unknown): value is {
    recinto_id: string;
    recinto_nombre: string;
    candidato_id: string;
    candidato_nombre: string;
    dignidad: DignidadElectoral;
    organizacion_id: string;
    organizacion_codigo: string;
    organizacion_nombre: string;
    votos: number | string;
  } {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return (
      typeof row['recinto_id'] === 'string' &&
      typeof row['recinto_nombre'] === 'string' &&
      typeof row['candidato_id'] === 'string' &&
      typeof row['candidato_nombre'] === 'string' &&
      (row['dignidad'] === 'ALCALDIA' || row['dignidad'] === 'PREFECTURA') &&
      typeof row['organizacion_id'] === 'string' &&
      typeof row['organizacion_codigo'] === 'string' &&
      typeof row['organizacion_nombre'] === 'string' &&
      (typeof row['votos'] === 'number' || typeof row['votos'] === 'string') &&
      Number.isFinite(Number(row['votos']))
    );
  }
}
