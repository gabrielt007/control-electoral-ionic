import { inject, Injectable } from '@angular/core';

import type { Acta, DignidadElectoral } from '../../../core/models/acta.model';
import type { Recinto } from '../../../core/models/recinto.model';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

const BUCKET_ACTAS = 'actas';

export class RecintoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RecintoError';
  }
}

export interface VeedorRecinto {
  id: string;
  cedula: string;
}

export interface MesaRecinto {
  id: string;
  numeroMesa: number;
  veedorId: string | null;
  actas: Partial<Record<DignidadElectoral, Acta>>;
}

export interface PanelRecinto {
  recinto: Recinto;
  mesas: MesaRecinto[];
  veedores: VeedorRecinto[];
}

export interface OrganizacionRecinto {
  id: string;
  nombre: string;
  codigo: string;
}

export interface ContextoCorreccionActa {
  mesa: MesaRecinto;
  dignidad: DignidadElectoral;
  acta: Acta;
  organizaciones: OrganizacionRecinto[];
  fotoFirmada: string | null;
  avisoFoto: string | null;
}

export interface DatosCorreccionActa {
  jrvId: string;
  dignidad: DignidadElectoral;
  votosOrganizaciones: Record<string, number>;
  blancos: number;
  nulos: number;
  totalSufragantes: number;
  foto: File | null;
}

export interface ResultadoCorreccionActa {
  acta: Acta;
  fotoFirmada: string | null;
  aviso: string | null;
}

interface JrvRow {
  id: string;
  recinto_id: string;
  numero_mesa: number;
  veedor_id: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class RecintoService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  async obtenerPanel(): Promise<PanelRecinto> {
    const recintoId = await this.obtenerIdRecinto();
    const [recintoResult, mesasResult, veedoresResult] = await Promise.all([
      this.supabase.client
        .from('recintos')
        .select('id, provincia, canton, parroquia, nombre, cantidad_jrv, created_at')
        .eq('id', recintoId)
        .single(),
      this.supabase.client
        .from('jrv')
        .select('id, recinto_id, numero_mesa, veedor_id')
        .eq('recinto_id', recintoId)
        .order('numero_mesa'),
      this.supabase.client
        .from('perfiles_usuario')
        .select('id, cedula')
        .eq('rol', 'VEEDOR')
        .eq('recinto_id', recintoId)
        .order('cedula'),
    ]);

    if (recintoResult.error) {
      throw recintoResult.error;
    }
    if (mesasResult.error) {
      throw mesasResult.error;
    }
    if (veedoresResult.error) {
      throw veedoresResult.error;
    }
    if (!this.esRecinto(recintoResult.data)) {
      throw new RecintoError('RECINTO_RESPUESTA_INVALIDA', 'Los datos del recinto no son válidos.');
    }

    const mesas = this.validarArray(mesasResult.data, this.esJrv);
    const veedores = this.validarArray(veedoresResult.data, this.esVeedor);
    if (mesas.length === 0) {
      return { recinto: recintoResult.data, mesas: [], veedores };
    }

    const { data: actasData, error: errorActas } = await this.supabase.client
      .from('actas')
      .select(
        'id, jrv_id, dignidad, votos_organizaciones, blancos, nulos, total_sufragantes, foto_url, latitud, longitud, created_at, updated_at',
      )
      .in(
        'jrv_id',
        mesas.map((mesa) => mesa.id),
      );
    if (errorActas) {
      throw errorActas;
    }

    const actas = this.validarArray(actasData, this.esActa);
    const actasPorMesa = new Map<string, Partial<Record<DignidadElectoral, Acta>>>();
    for (const acta of actas) {
      const actasMesa = actasPorMesa.get(acta.jrv_id) ?? {};
      actasMesa[acta.dignidad] = acta;
      actasPorMesa.set(acta.jrv_id, actasMesa);
    }

    return {
      recinto: recintoResult.data,
      veedores,
      mesas: mesas.map((mesa) => ({
        id: mesa.id,
        numeroMesa: mesa.numero_mesa,
        veedorId: mesa.veedor_id,
        actas: actasPorMesa.get(mesa.id) ?? {},
      })),
    };
  }

  async crearCuentaVeedor(cedula: string, correo: string): Promise<VeedorRecinto> {
    await this.obtenerIdRecinto();
    const { data, error } = await this.supabase.client.functions.invoke('crear-veedor', {
      body: { cedula: cedula.trim(), correo: correo.trim().toLowerCase() },
    });
    if (error) {
      throw await this.leerErrorFuncion(error);
    }
    if (!this.esVeedor(data)) {
      throw new RecintoError('RESPUESTA_INVALIDA', 'El servidor no devolvió la cuenta creada correctamente.');
    }
    return data;
  }

  async asignarVeedor(jrvId: string, veedorId: string | null): Promise<void> {
    const recintoId = await this.obtenerIdRecinto();
    if (veedorId) {
      const { data: veedor, error: errorVeedor } = await this.supabase.client
        .from('perfiles_usuario')
        .select('id')
        .eq('id', veedorId)
        .eq('rol', 'VEEDOR')
        .eq('recinto_id', recintoId)
        .maybeSingle();
      if (errorVeedor) {
        throw errorVeedor;
      }
      if (!veedor) {
        throw new RecintoError('VEEDOR_NO_VALIDO', 'Solo puedes asignar veedores de tu recinto.');
      }
    }

    const { data, error } = await this.supabase.client
      .from('jrv')
      .update({ veedor_id: veedorId })
      .eq('id', jrvId)
      .eq('recinto_id', recintoId)
      .select('id')
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      throw new RecintoError('JRV_NO_ENCONTRADA', 'No se encontró la mesa dentro de tu recinto.');
    }
  }

  async obtenerActaParaCorreccion(jrvId: string, dignidad: DignidadElectoral): Promise<ContextoCorreccionActa> {
    const mesa = await this.obtenerMesaPropia(jrvId);
    const [{ data: actaData, error: errorActa }, { data: organizacionesData, error: errorOrganizaciones }] =
      await Promise.all([
        this.supabase.client
          .from('actas')
          .select(
            'id, jrv_id, dignidad, votos_organizaciones, blancos, nulos, total_sufragantes, foto_url, latitud, longitud, created_at, updated_at',
          )
          .eq('jrv_id', jrvId)
          .eq('dignidad', dignidad)
          .maybeSingle(),
        this.supabase.client.from('organizaciones_politicas').select('id, nombre, codigo').order('codigo'),
      ]);

    if (errorActa) {
      throw errorActa;
    }
    if (errorOrganizaciones) {
      throw errorOrganizaciones;
    }
    if (!this.esActa(actaData) || actaData.jrv_id !== jrvId || actaData.dignidad !== dignidad) {
      throw new RecintoError('ACTA_NO_ENCONTRADA', 'No existe un acta de esa dignidad para la mesa seleccionada.');
    }
    const organizaciones = this.validarArray(organizacionesData, this.esOrganizacion);
    if (organizaciones.length !== 5) {
      throw new RecintoError(
        'ORGANIZACIONES_INVALIDAS',
        'La papeleta debe tener exactamente cinco organizaciones políticas configuradas.',
      );
    }

    let fotoFirmada: string | null = null;
    let avisoFoto: string | null = null;
    if (actaData.foto_url) {
      try {
        fotoFirmada = await this.crearUrlFirmada(actaData.foto_url);
      } catch {
        avisoFoto = 'No se pudo mostrar la foto actual; puedes reemplazarla al guardar la corrección.';
      }
    }

    return {
      mesa: { ...mesa, actas: { [dignidad]: actaData } },
      dignidad,
      acta: actaData,
      organizaciones,
      fotoFirmada,
      avisoFoto,
    };
  }

  async guardarCorreccionActa(datos: DatosCorreccionActa): Promise<ResultadoCorreccionActa> {
    await this.obtenerMesaPropia(datos.jrvId);
    const { data: actaActual, error: errorActa } = await this.supabase.client
      .from('actas')
      .select(
        'id, jrv_id, dignidad, votos_organizaciones, blancos, nulos, total_sufragantes, foto_url, latitud, longitud, created_at, updated_at',
      )
      .eq('jrv_id', datos.jrvId)
      .eq('dignidad', datos.dignidad)
      .maybeSingle();
    if (errorActa) {
      throw errorActa;
    }
    if (!this.esActa(actaActual) || actaActual.jrv_id !== datos.jrvId || actaActual.dignidad !== datos.dignidad) {
      throw new RecintoError('ACTA_NO_ENCONTRADA', 'El acta que intentas corregir ya no existe.');
    }
    await this.validarCuadre(datos);

    const nuevaRutaFoto = datos.foto ? this.crearRutaFoto(datos.jrvId, datos.dignidad, datos.foto) : null;
    const almacenamiento = this.supabase.client.storage.from(BUCKET_ACTAS);
    if (datos.foto && nuevaRutaFoto) {
      const { error: errorSubida } = await almacenamiento.upload(nuevaRutaFoto, datos.foto, {
        contentType: datos.foto.type,
        upsert: false,
      });
      if (errorSubida) {
        throw errorSubida;
      }
    }

    const { data, error } = await this.supabase.client
      .from('actas')
      .update({
        votos_organizaciones: datos.votosOrganizaciones,
        blancos: datos.blancos,
        nulos: datos.nulos,
        total_sufragantes: datos.totalSufragantes,
        ...(nuevaRutaFoto ? { foto_url: nuevaRutaFoto } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', actaActual.id)
      .eq('jrv_id', datos.jrvId)
      .select(
        'id, jrv_id, dignidad, votos_organizaciones, blancos, nulos, total_sufragantes, foto_url, latitud, longitud, created_at, updated_at',
      )
      .single();

    if (error) {
      if (nuevaRutaFoto) {
        const errorLimpieza = await this.retirarFoto(nuevaRutaFoto);
        if (errorLimpieza) {
          throw new RecintoError(
            'ACTA_Y_LIMPIEZA_FALLIDAS',
            `No se guardó la corrección (${error.message}) ni se pudo retirar la foto temporal (${errorLimpieza}).`,
          );
        }
      }
      throw error;
    }
    if (!this.esActa(data)) {
      throw new RecintoError('ACTA_RESPUESTA_INVALIDA', 'El servidor devolvió datos de acta no válidos.');
    }

    let aviso: string | null = null;
    if (nuevaRutaFoto) {
      const fotoAnterior = actaActual.foto_url;
      if (
        fotoAnterior &&
        fotoAnterior.startsWith(`${datos.jrvId}/${datos.dignidad}/`) &&
        fotoAnterior !== nuevaRutaFoto
      ) {
        const errorLimpieza = await this.retirarFoto(fotoAnterior);
        if (errorLimpieza) {
          aviso = 'El acta se corrigió, pero no se pudo eliminar la foto anterior.';
        }
      }
    }

    let fotoFirmada: string | null = null;
    if (data.foto_url) {
      try {
        fotoFirmada = await this.crearUrlFirmada(data.foto_url);
      } catch {
        aviso = aviso
          ? `${aviso} No se pudo mostrar la foto actualizada.`
          : 'La corrección se guardó, pero no se pudo mostrar la foto actualizada.';
      }
    }
    return { acta: data, fotoFirmada, aviso };
  }

  private async validarCuadre(datos: DatosCorreccionActa): Promise<void> {
    const organizaciones = await this.listarOrganizaciones();
    const esperadas = organizaciones.map((organizacion) => organizacion.id).sort();
    const recibidas = Object.keys(datos.votosOrganizaciones).sort();
    const cantidades = [
      ...Object.values(datos.votosOrganizaciones),
      datos.blancos,
      datos.nulos,
      datos.totalSufragantes,
    ];

    if (
      esperadas.length !== 5 ||
      esperadas.length !== recibidas.length ||
      esperadas.some((id, indice) => id !== recibidas[indice]) ||
      cantidades.some((cantidad) => !Number.isInteger(cantidad) || cantidad < 0)
    ) {
      throw new RecintoError('VOTOS_INVALIDOS', 'Revisa los votos y totales ingresados.');
    }

    const suma = Object.values(datos.votosOrganizaciones).reduce((total, votos) => total + votos, 0);
    if (suma + datos.blancos + datos.nulos !== datos.totalSufragantes) {
      throw new RecintoError('ACTA_DESCUADRADA', 'La suma de los votos debe coincidir con los sufragantes.');
    }
  }

  private async listarOrganizaciones(): Promise<OrganizacionRecinto[]> {
    const { data, error } = await this.supabase.client
      .from('organizaciones_politicas')
      .select('id, nombre, codigo')
      .order('codigo');
    if (error) {
      throw error;
    }
    return this.validarArray(data, this.esOrganizacion);
  }

  private async obtenerMesaPropia(jrvId: string): Promise<MesaRecinto> {
    const recintoId = await this.obtenerIdRecinto();
    const { data, error } = await this.supabase.client
      .from('jrv')
      .select('id, recinto_id, numero_mesa, veedor_id')
      .eq('id', jrvId)
      .eq('recinto_id', recintoId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!this.esJrv(data)) {
      throw new RecintoError('JRV_NO_ENCONTRADA', 'No se encontró la mesa dentro de tu recinto.');
    }
    return { id: data.id, numeroMesa: data.numero_mesa, veedorId: data.veedor_id, actas: {} };
  }

  private async obtenerIdRecinto(): Promise<string> {
    await this.auth.esperarInicializacion();
    const sesion = this.auth.sesion();
    const perfil = this.auth.perfil();
    if (!sesion || !perfil || perfil.id !== sesion.user.id || perfil.rol !== 'RECINTO' || !perfil.recinto_id) {
      throw new RecintoError('PERFIL_RECINTO_REQUERIDO', 'Se requiere una sesión activa de coordinador de recinto.');
    }
    return perfil.recinto_id;
  }

  private async crearUrlFirmada(ruta: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage.from(BUCKET_ACTAS).createSignedUrl(ruta, 600);
    if (error) {
      throw error;
    }
    return data.signedUrl;
  }

  private crearRutaFoto(jrvId: string, dignidad: DignidadElectoral, foto: File): string {
    if (foto.size <= 0 || foto.size > 10 * 1024 * 1024) {
      throw new RecintoError('FOTO_TAMANO_INVALIDO', 'La foto debe tener un tamaño máximo de 10 MB.');
    }
    const extension = foto.type === 'image/jpeg' ? 'jpg' : foto.type === 'image/png' ? 'png' : null;
    if (!extension) {
      throw new RecintoError('FOTO_FORMATO_INVALIDO', 'La foto debe estar en formato JPEG o PNG.');
    }
    return `${jrvId}/${dignidad}/${crypto.randomUUID()}.${extension}`;
  }

  private async retirarFoto(ruta: string): Promise<string | null> {
    try {
      const { error } = await this.supabase.client.storage.from(BUCKET_ACTAS).remove([ruta]);
      return error?.message ?? null;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message;
      }
      return error instanceof Error ? error.message : 'error inesperado';
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
        return new RecintoError(body.code, body.message);
      }
    } catch {
      return error;
    }
    return error;
  }

  private validarArray<T>(value: unknown, validar: (item: unknown) => item is T): T[] {
    if (!Array.isArray(value) || !value.every(validar)) {
      throw new RecintoError('RESPUESTA_INVALIDA', 'El servidor devolvió datos con un formato inválido.');
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

  private esJrv(value: unknown): value is JrvRow {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return (
      typeof row['id'] === 'string' &&
      typeof row['recinto_id'] === 'string' &&
      typeof row['numero_mesa'] === 'number' &&
      (typeof row['veedor_id'] === 'string' || row['veedor_id'] === null)
    );
  }

  private esVeedor(value: unknown): value is VeedorRecinto {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row['id'] === 'string' && typeof row['cedula'] === 'string';
  }

  private esOrganizacion(value: unknown): value is OrganizacionRecinto {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    return typeof row['id'] === 'string' && typeof row['nombre'] === 'string' && typeof row['codigo'] === 'string';
  }

  private esActa(value: unknown): value is Acta {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const row = value as Record<string, unknown>;
    const votos = row['votos_organizaciones'];
    const votosValidos =
      typeof votos === 'object' &&
      votos !== null &&
      !Array.isArray(votos) &&
      Object.values(votos).every((voto) => typeof voto === 'number' && Number.isInteger(voto) && voto >= 0);
    return (
      typeof row['id'] === 'string' &&
      typeof row['jrv_id'] === 'string' &&
      (row['dignidad'] === 'ALCALDIA' || row['dignidad'] === 'PREFECTURA') &&
      votosValidos &&
      typeof row['blancos'] === 'number' &&
      typeof row['nulos'] === 'number' &&
      typeof row['total_sufragantes'] === 'number' &&
      (typeof row['foto_url'] === 'string' || row['foto_url'] === null) &&
      (typeof row['latitud'] === 'number' || row['latitud'] === null) &&
      (typeof row['longitud'] === 'number' || row['longitud'] === null) &&
      typeof row['created_at'] === 'string' &&
      typeof row['updated_at'] === 'string'
    );
  }
}
