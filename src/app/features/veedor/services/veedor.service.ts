import { inject, Injectable } from '@angular/core';

import type { Acta, DignidadElectoral } from '../../../core/models/acta.model';
import type { Recinto } from '../../../core/models/recinto.model';
import { AuthService } from '../../../core/services/auth.service';
import type { CapturaCamaraGps } from '../../../core/services/camera-gps.service';
import { SupabaseService } from '../../../core/services/supabase.service';

const BUCKET_ACTAS = 'actas';

export class VeedorError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VeedorError';
  }
}

export interface OrganizacionPolitica {
  id: string;
  codigo: string;
  nombre: string;
}

export interface JrvAsignada {
  id: string;
  numeroMesa: number;
  recinto: Pick<Recinto, 'id' | 'provincia' | 'canton' | 'parroquia' | 'nombre'>;
  actas: Partial<Record<DignidadElectoral, Acta>>;
}

export interface ContextoActa {
  jrv: JrvAsignada;
  dignidad: DignidadElectoral;
  organizaciones: OrganizacionPolitica[];
  acta: Acta | null;
}

export interface DatosActa {
  jrvId: string;
  dignidad: DignidadElectoral;
  votosOrganizaciones: Record<string, number>;
  blancos: number;
  nulos: number;
  totalSufragantes: number;
  captura: CapturaCamaraGps;
}

export interface ResultadoGuardarActa {
  acta: Acta;
  avisoLimpieza: string | null;
}

interface JrvRow {
  id: string;
  recinto_id: string;
  numero_mesa: number;
}

type RecintoVeedoria = Pick<Recinto, 'id' | 'provincia' | 'canton' | 'parroquia' | 'nombre'>;

@Injectable({
  providedIn: 'root',
})
export class VeedorService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  async listarJrvAsignadas(): Promise<JrvAsignada[]> {
    const veedorId = await this.obtenerIdVeedor();
    const { data: mesasData, error: mesasError } = await this.supabase.client
      .from('jrv')
      .select('id, recinto_id, numero_mesa')
      .eq('veedor_id', veedorId)
      .order('numero_mesa');

    if (mesasError) {
      throw mesasError;
    }

    const mesas = this.validarArray(mesasData, this.esJrvRow);
    if (mesas.length === 0) {
      return [];
    }

    const idsMesas = mesas.map((mesa) => mesa.id);
    const idsRecintos = [...new Set(mesas.map((mesa) => mesa.recinto_id))];
    const [recintosResult, actasResult] = await Promise.all([
      this.supabase.client.from('recintos').select('id, provincia, canton, parroquia, nombre').in('id', idsRecintos),
      this.supabase.client
        .from('actas')
        .select(
          'id, jrv_id, dignidad, votos_organizaciones, blancos, nulos, total_sufragantes, foto_url, latitud, longitud, created_at, updated_at',
        )
        .in('jrv_id', idsMesas),
    ]);

    if (recintosResult.error) {
      throw recintosResult.error;
    }
    if (actasResult.error) {
      throw actasResult.error;
    }

    const recintos = this.validarArray(recintosResult.data, this.esRecinto);
    const actas = this.validarArray(actasResult.data, this.esActa);
    const recintosPorId = new Map(recintos.map((recinto) => [recinto.id, recinto]));
    const actasPorJrv = new Map<string, Partial<Record<DignidadElectoral, Acta>>>();

    for (const acta of actas) {
      const actasDeJrv = actasPorJrv.get(acta.jrv_id) ?? {};
      actasDeJrv[acta.dignidad] = acta;
      actasPorJrv.set(acta.jrv_id, actasDeJrv);
    }

    return mesas.map((mesa) => {
      const recinto = recintosPorId.get(mesa.recinto_id);
      if (!recinto) {
        throw new VeedorError('RECINTO_NO_ENCONTRADO', 'No se encontró el recinto de una JRV asignada.');
      }

      return {
        id: mesa.id,
        numeroMesa: mesa.numero_mesa,
        recinto,
        actas: actasPorJrv.get(mesa.id) ?? {},
      };
    });
  }

  async obtenerContextoActa(jrvId: string, dignidad: DignidadElectoral): Promise<ContextoActa> {
    const jrvs = await this.listarJrvAsignadas();
    const jrv = jrvs.find((mesa) => mesa.id === jrvId);
    if (!jrv) {
      throw new VeedorError('JRV_NO_ASIGNADA', 'Esta JRV no está asignada a tu usuario.');
    }

    const organizaciones = await this.listarOrganizaciones();
    if (organizaciones.length !== 5) {
      throw new VeedorError(
        'ORGANIZACIONES_INVALIDAS',
        'La papeleta debe tener exactamente cinco organizaciones políticas configuradas.',
      );
    }

    return {
      jrv,
      dignidad,
      organizaciones,
      acta: jrv.actas[dignidad] ?? null,
    };
  }

  async guardarActa(datos: DatosActa): Promise<ResultadoGuardarActa> {
    const veedorId = await this.obtenerIdVeedor();
    await this.verificarJrvAsignada(datos.jrvId, veedorId);
    await this.validarActa(datos);

    const { data: actaActual, error: errorActaActual } = await this.supabase.client
      .from('actas')
      .select('foto_url')
      .eq('jrv_id', datos.jrvId)
      .eq('dignidad', datos.dignidad)
      .maybeSingle();

    if (errorActaActual) {
      throw errorActaActual;
    }

    const blob = await this.obtenerBlobFoto(datos.captura.fotoWebPath);
    const extension = this.obtenerExtension(blob.type);
    const nombreFoto = crypto.randomUUID();
    const rutaFoto = `${datos.jrvId}/${datos.dignidad}/${nombreFoto}.${extension}`;
    const almacenamiento = this.supabase.client.storage.from(BUCKET_ACTAS);
    const { error: errorSubida } = await almacenamiento.upload(rutaFoto, blob, {
      contentType: blob.type === 'image/jpg' ? 'image/jpeg' : blob.type,
      upsert: false,
    });

    if (errorSubida) {
      throw errorSubida;
    }

    const consultaActa = this.supabase.client
      .from('actas')
      .upsert(
        {
          jrv_id: datos.jrvId,
          dignidad: datos.dignidad,
          votos_organizaciones: datos.votosOrganizaciones,
          blancos: datos.blancos,
          nulos: datos.nulos,
          total_sufragantes: datos.totalSufragantes,
          foto_url: rutaFoto,
          latitud: datos.captura.latitud,
          longitud: datos.captura.longitud,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'jrv_id,dignidad' },
      )
      .select(
        'id, jrv_id, dignidad, votos_organizaciones, blancos, nulos, total_sufragantes, foto_url, latitud, longitud, created_at, updated_at',
      )
      .single();
    const { data, error } = await consultaActa;
    if (error) {
      const errorLimpieza = await this.retirarFotoTemporal(rutaFoto);
      if (errorLimpieza) {
        throw new VeedorError(
          'ACTA_Y_LIMPIEZA_FALLIDAS',
          `No se guardó el acta (${error.message}) ni se pudo retirar la foto temporal (${errorLimpieza}).`,
        );
      }
      throw error;
    }
    if (!this.esActa(data)) {
      throw new VeedorError('ACTA_RESPUESTA_INVALIDA', 'La respuesta del servidor no contiene un acta válida.');
    }

    let avisoLimpieza: string | null = null;
    const fotoAnterior = this.obtenerFotoAnterior(actaActual);
    if (fotoAnterior && fotoAnterior.startsWith(`${datos.jrvId}/`) && fotoAnterior !== rutaFoto) {
      const { error: errorLimpieza } = await almacenamiento.remove([fotoAnterior]);
      if (errorLimpieza) {
        avisoLimpieza = 'El acta se guardó, pero no se pudo eliminar la foto anterior.';
      }
    }

    return { acta: data, avisoLimpieza };
  }

  private async listarOrganizaciones(): Promise<OrganizacionPolitica[]> {
    const { data, error } = await this.supabase.client
      .from('organizaciones_politicas')
      .select('id, codigo, nombre')
      .order('codigo');

    if (error) {
      throw error;
    }
    return this.validarArray(data, this.esOrganizacion);
  }

  private async verificarJrvAsignada(jrvId: string, veedorId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('jrv')
      .select('id')
      .eq('id', jrvId)
      .eq('veedor_id', veedorId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new VeedorError('JRV_NO_ASIGNADA', 'Esta JRV no está asignada a tu usuario.');
    }
  }

  private async validarActa(datos: DatosActa): Promise<void> {
    const organizaciones = await this.listarOrganizaciones();
    const idsEsperados = organizaciones.map((organizacion) => organizacion.id).sort();
    const idsRecibidos = Object.keys(datos.votosOrganizaciones).sort();
    if (
      idsEsperados.length !== 5 ||
      idsEsperados.length !== idsRecibidos.length ||
      idsEsperados.some((id, indice) => id !== idsRecibidos[indice]) ||
      Object.values(datos.votosOrganizaciones).some((voto) => !Number.isInteger(voto) || voto < 0)
    ) {
      throw new VeedorError('VOTOS_INVALIDOS', 'Revisa los votos ingresados por organización política.');
    }

    const cantidades = [
      ...Object.values(datos.votosOrganizaciones),
      datos.blancos,
      datos.nulos,
      datos.totalSufragantes,
    ];
    if (cantidades.some((cantidad) => !Number.isInteger(cantidad) || cantidad < 0)) {
      throw new VeedorError('VOTOS_INVALIDOS', 'Los votos y sufragantes deben ser enteros no negativos.');
    }

    const suma = Object.values(datos.votosOrganizaciones).reduce((total, votos) => total + votos, 0);
    if (suma + datos.blancos + datos.nulos !== datos.totalSufragantes) {
      throw new VeedorError('ACTA_DESCUADRADA', 'La suma de los votos debe coincidir con los sufragantes.');
    }
  }

  private async obtenerIdVeedor(): Promise<string> {
    await this.auth.esperarInicializacion();
    const sesion = this.auth.sesion();
    const perfil = this.auth.perfil();
    if (!sesion || !perfil || perfil.rol !== 'VEEDOR' || perfil.id !== sesion.user.id) {
      throw new VeedorError('PERFIL_VEEDOR_REQUERIDO', 'Se requiere una sesión activa de veedor.');
    }
    return sesion.user.id;
  }

  private async obtenerBlobFoto(fotoWebPath: string): Promise<Blob> {
    const respuesta = await fetch(fotoWebPath);
    if (!respuesta.ok) {
      throw new VeedorError('FOTO_NO_LEGIBLE', 'No se pudo leer la foto capturada.');
    }
    return respuesta.blob();
  }

  private async retirarFotoTemporal(rutaFoto: string): Promise<string | null> {
    try {
      const { error } = await this.supabase.client.storage.from(BUCKET_ACTAS).remove([rutaFoto]);
      return error?.message ?? null;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message;
      }
      return error instanceof Error ? error.message : 'error inesperado';
    }
  }

  private obtenerExtension(tipo: string): 'jpg' | 'png' {
    if (tipo === 'image/jpeg' || tipo === 'image/jpg') {
      return 'jpg';
    }
    if (tipo === 'image/png') {
      return 'png';
    }
    throw new VeedorError('FORMATO_FOTO_INVALIDO', 'La foto debe estar en formato JPEG o PNG.');
  }

  private obtenerFotoAnterior(value: unknown): string | null {
    if (typeof value !== 'object' || value === null || !('foto_url' in value)) {
      return null;
    }
    return typeof value.foto_url === 'string' ? value.foto_url : null;
  }

  private validarArray<T>(value: unknown, validar: (item: unknown) => item is T): T[] {
    if (!Array.isArray(value) || !value.every(validar)) {
      throw new VeedorError('RESPUESTA_INVALIDA', 'El servidor devolvió datos con un formato inválido.');
    }
    return value;
  }

  private esJrvRow(value: unknown): value is JrvRow {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const fila = value as Record<string, unknown>;
    return (
      typeof fila['id'] === 'string' &&
      typeof fila['recinto_id'] === 'string' &&
      typeof fila['numero_mesa'] === 'number'
    );
  }

  private esRecinto(value: unknown): value is RecintoVeedoria {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const recinto = value as Record<string, unknown>;
    return (
      typeof recinto['id'] === 'string' &&
      typeof recinto['provincia'] === 'string' &&
      typeof recinto['canton'] === 'string' &&
      typeof recinto['parroquia'] === 'string' &&
      typeof recinto['nombre'] === 'string'
    );
  }

  private esOrganizacion(value: unknown): value is OrganizacionPolitica {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const organizacion = value as Record<string, unknown>;
    return (
      typeof organizacion['id'] === 'string' &&
      typeof organizacion['codigo'] === 'string' &&
      typeof organizacion['nombre'] === 'string'
    );
  }

  private esActa(value: unknown): value is Acta {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const acta = value as Record<string, unknown>;
    const votos = acta['votos_organizaciones'];
    return (
      typeof acta['id'] === 'string' &&
      typeof acta['jrv_id'] === 'string' &&
      (acta['dignidad'] === 'ALCALDIA' || acta['dignidad'] === 'PREFECTURA') &&
      typeof votos === 'object' &&
      votos !== null &&
      !Array.isArray(votos) &&
      typeof acta['blancos'] === 'number' &&
      typeof acta['nulos'] === 'number' &&
      typeof acta['total_sufragantes'] === 'number' &&
      (typeof acta['foto_url'] === 'string' || acta['foto_url'] === null) &&
      (typeof acta['latitud'] === 'number' || acta['latitud'] === null) &&
      (typeof acta['longitud'] === 'number' || acta['longitud'] === null) &&
      typeof acta['created_at'] === 'string' &&
      typeof acta['updated_at'] === 'string'
    );
  }
}
