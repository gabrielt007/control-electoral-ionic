import { createClient } from 'npm:@supabase/supabase-js@2';

const PASSWORD_INICIAL = 'Ecuador2026';
const CABECERAS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface SolicitudCrearVeedor {
  cedula: string;
  correo: string;
}

function responder(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: CABECERAS_CORS });
}

function esSolicitud(value: unknown): value is SolicitudCrearVeedor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cedula' in value &&
    typeof value.cedula === 'string' &&
    'correo' in value &&
    typeof value.correo === 'string'
  );
}

function cedulaEcuatorianaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24 || Number(cedula[2]) >= 6) {
    return false;
  }

  const suma = [...cedula.slice(0, 9)].reduce((total, digito, indice) => {
    const producto = Number(digito) * (indice % 2 === 0 ? 2 : 1);
    return total + (producto > 9 ? producto - 9 : producto);
  }, 0);

  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CABECERAS_CORS });
  }
  if (request.method !== 'POST') {
    return responder(405, { code: 'METODO_NO_PERMITIDO', message: 'Usa una solicitud POST.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return responder(500, { code: 'CONFIGURACION_INCOMPLETA', message: 'El servicio de cuentas no está configurado.' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return responder(401, { code: 'SESION_REQUERIDA', message: 'Inicia sesión con una cuenta coordinadora.' });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return responder(400, { code: 'SOLICITUD_INVALIDA', message: 'El contenido de la solicitud no es válido.' });
    }
    if (!esSolicitud(body)) {
      return responder(400, { code: 'SOLICITUD_INVALIDA', message: 'Completa la cédula y el correo electrónico.' });
    }

    const cedula = body.cedula.trim();
    const correo = body.correo.trim().toLowerCase();
    if (!cedulaEcuatorianaValida(cedula)) {
      return responder(400, { code: 'CEDULA_INVALIDA', message: 'La cédula ecuatoriana no es válida.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return responder(400, { code: 'CORREO_INVALIDO', message: 'Ingresa un correo electrónico válido.' });
    }

    const clienteCoordinador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authorization.slice('Bearer '.length);
    const { data: usuarioSesion, error: errorSesion } = await clienteCoordinador.auth.getUser(token);
    if (errorSesion || !usuarioSesion.user) {
      return responder(401, { code: 'SESION_REQUERIDA', message: 'La sesión expiró. Inicia sesión nuevamente.' });
    }

    const { data: perfilCoordinador, error: errorPerfilCoordinador } = await clienteCoordinador
      .from('perfiles_usuario')
      .select('rol, recinto_id')
      .eq('id', usuarioSesion.user.id)
      .maybeSingle();
    if (errorPerfilCoordinador || perfilCoordinador?.rol !== 'RECINTO' || !perfilCoordinador.recinto_id) {
      return responder(403, {
        code: 'PERFIL_RECINTO_REQUERIDO',
        message: 'Solo un coordinador de recinto puede crear cuentas de veedor.',
      });
    }

    const administrador = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: cedulaExistente, error: errorConsultaCedula } = await administrador
      .from('perfiles_usuario')
      .select('id')
      .eq('cedula', cedula)
      .maybeSingle();
    if (errorConsultaCedula) {
      return responder(500, { code: 'CONSULTA_FALLIDA', message: 'No se pudo verificar la cédula.' });
    }
    if (cedulaExistente) {
      return responder(409, { code: 'CEDULA_EN_USO', message: 'Ya existe una cuenta con esa cédula.' });
    }

    const { data: cuenta, error: errorCuenta } = await administrador.auth.admin.createUser({
      email: correo,
      password: PASSWORD_INICIAL,
      email_confirm: true,
    });
    if (errorCuenta || !cuenta.user) {
      return responder(409, {
        code: 'CUENTA_NO_CREADA',
        message: 'No se pudo crear la cuenta. Verifica que el correo no esté registrado.',
      });
    }

    const { error: errorCreacionPerfil } = await administrador.from('perfiles_usuario').insert({
      id: cuenta.user.id,
      cedula,
      rol: 'VEEDOR',
      recinto_id: perfilCoordinador.recinto_id,
      debe_cambiar_password: true,
    });
    if (errorCreacionPerfil) {
      const { error: errorLimpieza } = await administrador.auth.admin.deleteUser(cuenta.user.id);
      if (errorLimpieza) {
        return responder(500, {
          code: 'CUENTA_INCOMPLETA',
          message: 'No se pudo guardar el perfil ni retirar la cuenta incompleta. Requiere revisión administrativa.',
        });
      }
      return responder(409, {
        code: 'PERFIL_NO_CREADO',
        message: 'No se pudo guardar el perfil del veedor. Verifica que la cédula no esté registrada.',
      });
    }

    return responder(201, { id: cuenta.user.id, cedula, correo });
  } catch {
    return responder(500, { code: 'ERROR_INTERNO', message: 'No se pudo completar la creación de la cuenta.' });
  }
});
