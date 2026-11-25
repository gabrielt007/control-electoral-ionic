# Sistema de control electoral

Aplicación Ionic/Angular para administrar recintos y Juntas Receptoras del Voto
(JRV), registrar y corregir actas, y consultar resultados electorales. El
backend utiliza Supabase y la aplicación puede empaquetarse para Android con
Capacitor.

> **Alcance de esta entrega:** la aplicación trabaja online-first. La
> persistencia local de actas y la sincronización offline (R10) están
> documentadas como una mejora opcional, no como una función de la línea base.
> Se requiere conexión a Supabase para operar.

## 1. Descripción general y alcance

### Roles y funciones

| Rol | Responsabilidades principales |
| --- | --- |
| `PROVINCIAL` | Crea recintos y sus JRV, registra un coordinador para cada recinto, revisa el avance de actas y consulta el consolidado de votos. |
| `RECINTO` | Administra su recinto, crea cuentas de veedor, asigna veedores a sus JRV y puede revisar o corregir actas de las mesas de su recinto. |
| `VEEDOR` | Consulta sus JRV asignadas y registra o corrige las actas de esas mesas. La captura de acta del veedor incorpora fotografía y ubicación GPS. |

El sistema admite las dignidades `ALCALDIA` y `PREFECTURA`. Cada acta guarda
los votos por organización política, votos blancos, votos nulos, total de
sufragantes, evidencia fotográfica y coordenadas cuando están disponibles.

### Trazabilidad de R1–R9

Los ADR asocian los requisitos R1–R9 con la aplicación, pero en el repositorio
no se encontró una matriz independiente con la redacción completa de cada
requisito. La tabla resume las capacidades visibles en el código y la
trazabilidad descrita por esos ADR; debe contrastarse con la rúbrica oficial de
la asignatura.

| Requisito | Cobertura observable |
| --- | --- |
| **R1 — Estructura electoral** | Modelo relacional de recintos, JRV, perfiles, organizaciones, candidaturas y actas; el rol provincial puede crear un recinto junto con sus JRV. |
| **R2 — Identificación y acceso** | Inicio de sesión con cédula y contraseña. La aplicación valida el formato de cédula y resuelve el correo de Auth mediante `obtener_correo_por_cedula`. |
| **R3 — Cuentas y contraseñas** | Creación jerárquica de cuentas mediante Edge Functions, cambio obligatorio de la clave inicial y solicitud de recuperación por correo. **La app implementa el envío de la solicitud, pero no tiene una pantalla propia para completar el cambio desde el enlace de recuperación.** |
| **R4 — Gestión por rol** | Paneles para la gestión provincial, la coordinación de recinto y la revisión de avance; el acceso a páginas también está protegido con guards. |
| **R5 — Registro y corrección de actas** | Formularios para actas de Alcaldía y Prefectura; el veedor registra actas de sus JRV y el coordinador de recinto puede corregir las de su recinto. |
| **R6 — Consistencia del escrutinio** | Validador cruzado: los votos de las cinco organizaciones, más blancos y nulos, deben coincidir con el total de sufragantes. |
| **R7 — Evidencia** | Captura desde cámara para el flujo del veedor, control local de nitidez, lectura de GPS y almacenamiento privado de fotos. El coordinador puede reemplazar una foto al corregir un acta. |
| **R8 — Aislamiento y seguridad** | Políticas RLS en PostgreSQL y Storage restringen lecturas y escrituras por rol, recinto y asignación de JRV. |
| **R9 — Calidad y separación** | Presentación, servicios, modelos y validadores están organizados por capas; la interfaz valida formularios y muestra errores. |

El `seed.sql` incorpora datos electorales demostrativos, pero no crea usuarios de
Supabase Auth ni credenciales de prueba. La provisión de cuentas debe hacerse
con un proyecto Supabase de pruebas.

## 2. Arquitectura y stack tecnológico

- **Ionic Angular** con componentes Angular standalone, formularios reactivos,
  navegación y guards.
- **Capacitor** para integrar la app web con capacidades móviles. Se usan
  `@capacitor/camera` y `@capacitor/geolocation`; el control de nitidez se
  ejecuta localmente en Canvas mediante la varianza del Laplaciano.
- **Supabase**:
  - PostgreSQL para los datos y las restricciones relacionales.
  - Auth para sesiones, inicio de sesión, cambio de contraseña y solicitudes de
    recuperación.
  - Row Level Security (RLS) para autorización en el servidor.
  - Storage con el bucket privado `actas`, limitado a imágenes JPEG y PNG de
    hasta 10 MB.
  - RPC para la resolución de correo, cambio de contraseña, creación de
    recinto/JRV y consolidado provincial.
  - Edge Functions `crear-coordinador` y `crear-veedor` para aprovisionar
    cuentas sin cambiar la sesión del usuario que las crea.

Las versiones declaradas actualmente incluyen Angular `22.2.x`, Ionic Angular
`9.x` y Capacitor `8.x`. El paquete de Supabase JS está declarado en el
`package.json` del directorio superior, mientras que la aplicación Angular
tiene su propio manifiesto y lockfile.

### Organización del código

- `src/app/core/`: servicios transversales (Auth, Supabase, cámara/GPS),
  modelos y guards.
- `src/app/shared/`: validadores reutilizables, como cédula ecuatoriana,
  contraseña y cuadre del acta.
- `src/app/features/`: páginas y servicios de `auth`, `provincial`, `recinto` y
  `veedor`.
- `supabase/`: scripts SQL, datos demostrativos y Edge Functions.
- `docs/adr/`: decisiones de arquitectura.

### ADR

- [ADR-001: Ionic Angular standalone](docs/adr/ADR-001-framework-ionic-angular.md)
- [ADR-002: Supabase como backend](docs/adr/ADR-002-backend-supabase.md)
- [ADR-003: arquitectura por capas y dominios](docs/adr/ADR-003-arquitectura-capas-dominios.md)
- [ADR-004: formularios reactivos y validadores](docs/adr/ADR-004-formularios-reactivos-validadores.md)
- [ADR-005: cámara, GPS y nitidez](docs/adr/ADR-005-camara-gps-nitidez-capacitor.md)
- [ADR-006: alcance online-first y mejora offline opcional](docs/adr/ADR-006-soporte-offline-opcional.md)

## 3. Configuración y despliegue

### Requisitos previos

- Node.js compatible con las dependencias del lockfile. Las versiones actuales
  de Angular CLI requieren Node `^22.22.3`, `^24.15.0` o `>=26.0.0`.
- npm.
- Un proyecto Supabase para desarrollo/pruebas.
- Para Android: Android Studio, Android SDK y las herramientas de compilación
  compatibles con Capacitor 8.
- Supabase CLI para aplicar/desplegar recursos desde terminal.

### Configuración del cliente

El cliente lee `src/environments/environment.ts` y, para compilaciones de
producción, Angular lo reemplaza por `src/environments/environment.prod.ts`.
Actualmente, las propiedades se llaman `supabaseUrl` y
`supabaseAnonKey` (URL del proyecto y clave pública `anon`/publishable):

```ts
export const environment = {
  production: false,
  supabaseUrl: '<SUPABASE_URL>',
  supabaseAnonKey: '<SUPABASE_ANON_KEY>',
};
```

En `environment.prod.ts`, `production` debe ser `true` y los otros dos valores
deben corresponder al proyecto de producción. El ejemplo usa únicamente
placeholders; no copie credenciales reales a este README.

`anonKey` es una clave pública del cliente, no una credencial administrativa.
La seguridad de los datos depende de las políticas RLS y de Storage. **No
agregue `service_role` a los archivos de entorno del frontend**: Angular incluye
esos valores en los recursos descargables de la aplicación.

El repositorio contiene dos manifiestos npm. En una instalación limpia, ejecute
ambos comandos desde las carpetas indicadas para instalar también Supabase JS,
declarado en el manifiesto superior:

```powershell
# Raíz del repositorio (directorio que contiene package.json y control-electoral-ionic/)
npm ci

Set-Location .\control-electoral-ionic
npm ci
```

### Base de datos, RLS y Storage

En el SQL Editor de Supabase, aplique los scripts en este orden, como se indica
en [`supabase/README.md`](supabase/README.md):

1. `supabase/schema.sql` — tipos, tablas, restricciones, función de acceso a
   JRV asignadas, permisos base y políticas iniciales.
2. `supabase/rls_roles.sql` — funciones de contexto y políticas para los roles
   provincial y recinto.
3. `supabase/rpc_auth.sql` — búsqueda del correo por cédula y marcado de cambio
   de contraseña.
4. `supabase/provincial.sql` — creación transaccional de recinto/JRV,
   coordinador único por recinto y resumen provincial de votos.
5. `supabase/storage_actas.sql` — bucket privado `actas` y políticas iniciales
   de fotos para veedores.
6. `supabase/recinto_coordinador.sql` — límites de asignación al recinto y
   ampliación de permisos de Storage para coordinadores.

Los primeros scripts se aplican una vez en cada proyecto; `provincial.sql` y
`recinto_coordinador.sql` pueden reaplicarse según `supabase/README.md`. Antes
de aplicar `provincial.sql`, resuelva posibles recintos con más de un perfil de
coordinador, pues el índice único no podrá crearse mientras existan duplicados.

Después de crear el esquema, `supabase/seed.sql` es opcional: agrega un recinto,
cinco organizaciones, candidaturas y JRV demostrativas. No crea usuarios de
Auth ni asigna veedores.

### Edge Functions

Las dos funciones requieren despliegue y secretos de servidor. Desde
`control-electoral-ionic/`, con Supabase CLI instalado, inicialice la
configuración local una vez si todavía no existe `supabase/config.toml`:

```powershell
supabase init
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set "SUPABASE_URL=<SUPABASE_URL>" "SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>" "SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>"
supabase functions deploy crear-coordinador
supabase functions deploy crear-veedor
```

Configure esos secretos en el entorno de Supabase Functions. La
`SUPABASE_SERVICE_ROLE_KEY` solo la usan las Edge Functions para operaciones
administrativas; no se incluye en Angular, en el APK ni en el repositorio.
Las funciones validan el rol de quien las invoca y crean cuentas con cambio
obligatorio de contraseña.

### URLs de Authentication

En **Supabase Dashboard → Authentication → URL Configuration**:

1. Configure **Site URL** con el origen real de la app desplegada.
2. Añada a **Redirect URLs** los orígenes de desarrollo que vaya a utilizar
   (`http://localhost:8100` para Ionic CLI o `http://localhost:4200` para
   `npm start`) y el origen de producción.
3. Si se configura en el futuro una URL específica de callback para recuperación,
   agréguela también a la lista permitida y al flujo de la aplicación.

El código actual llama a `resetPasswordForEmail` sin un `redirectTo` explícito.
La pantalla existente confirma que se solicitó el correo, pero el repositorio
no contiene una ruta/pantalla dedicada para establecer una nueva clave desde el
enlace de recuperación. La URL de Auth por sí sola no completa esa parte del
flujo.

## 4. Ejecución local y compilación Android

Desde `control-electoral-ionic/`, después de instalar dependencias y configurar
Supabase:

```powershell
# Instalar Ionic CLI si no está disponible globalmente
npm install -g @ionic/cli

# Servidor de desarrollo Ionic (por defecto, http://localhost:8100)
ionic serve
```

Alternativamente, `npm start` ejecuta `ng serve` (puerto 4200). La compilación
web de producción se puede ejecutar con `ionic build` o `npm run build`; el
directorio de salida configurado para Capacitor es `www/`.

### Pruebas y lint

```powershell
npm run test:unit       # Vitest mediante Angular CLI
npm run test:e2e        # Playwright; inicia npm start en localhost:4200
npm test                # Unitarias y E2E
npm run eslint          # ESLint para la app y pruebas
npm run typecheck:e2e   # TypeScript de Playwright
npm run lint            # ESLint + tipos E2E + Prettier
```

Si Playwright aún no tiene instalado Chromium en la máquina:

```powershell
npx playwright install chromium
```

La suite E2E configurada usa un dispositivo emulado Pixel 7 y actualmente
verifica la navegación desde `/` al login. Las pruebas unitarias incluyen
validación de cédula, cuadre de votos, contraseña y cálculo/umbral de nitidez.
Las políticas RLS, el correo de Auth, Storage, GPS y las Edge Functions
requieren además una verificación manual en un proyecto Supabase/dispositivo de
prueba.

**Estado de formato observado en este checkout:** ESLint y la verificación
TypeScript se pueden ejecutar por separado. El paso Prettier de `npm run lint`
reporta actualmente formato en `capacitor.config.ts` y en los dos archivos
`src/environments/environment*.ts`; no formatee esos archivos a ciegas si desea
mantener cambios locales.

### APK Android

El checkout actual no incluye una carpeta `android/` ni declara
`@capacitor/android` en el `package.json` de la app. Para generar la plataforma
nativa por primera vez, desde `control-electoral-ionic/`:

```powershell
npm install @capacitor/android@^8
npx cap add android
ionic build
npx cap sync android
npx cap open android
```

En Android Studio, sincronice Gradle y use **Build → Build APK(s)** para crear
un APK de depuración. En Windows también puede compilarlo por terminal:

```powershell
Set-Location .\android
.\gradlew.bat assembleDebug
```

El APK de depuración queda normalmente en
`android/app/build/outputs/apk/debug/app-debug.apk`. Para una entrega firmada,
configure una keystore de release fuera del repositorio y use **Build →
Generate Signed Bundle / APK** en Android Studio. Mantenga las claves de firma
fuera del control de versiones.

## 5. Guía de verificación funcional y credenciales de prueba

Las cuentas de prueba deben existir en un proyecto Supabase aislado; no se
incluyen en `seed.sql`. Por seguridad, el README no almacena cédulas ni
contraseñas reales. Sustituye estos placeholders únicamente en material privado
de la demostración:

| Rol | Cédula | Contraseña | Observaciones |
| :--- | :--- | :--- | :--- |
| `PROVINCIAL` | `<CEDULA_PROVINCIAL_DE_PRUEBA>` | `<CLAVE_PROVINCIAL_DE_PRUEBA>` | Acceso a consolidado provincial y creación de coordinadores de recinto. |
| `RECINTO` | `<CEDULA_RECINTO_DE_PRUEBA>` | `<CLAVE_RECINTO_DE_PRUEBA>` | Acceso a gestión de su recinto y creación/asignación de veedores. |
| `VEEDOR` | `<CEDULA_VEEDOR_DE_PRUEBA>` | Clave personalizada tras primer ingreso | Acceso a sus JRV asignadas para registro y corrección de actas con foto y GPS. |

No use cédulas, correos, claves o fotos de personas reales. La clave inicial
configurada en las funciones debe entregarse por un canal de prueba controlado;
no la publique en documentación. Cambie la clave en el primer ingreso.

### Escenarios

1. **Preparar datos y usuarios:** aplique los SQL en el orden indicado y, si
   hace falta, ejecute `seed.sql`. Cree una cuenta provincial de prueba en
   Supabase Auth y su perfil de rol `PROVINCIAL` por un procedimiento
   administrativo seguro. Desde esa sesión cree un recinto/coordinador y, desde
   la sesión de recinto, cree un veedor.
2. **Autenticación por cédula:** ingrese la cédula de prueba y su clave
   asignada. Compruebe que una cédula inválida o una clave incorrecta no inicia
   sesión y que el perfil determina la ruta correspondiente.
3. **Cambio obligatorio:** ingrese con una cuenta recién aprovisionada. Debe
   aparecer el formulario de cambio, rechazar la clave inicial y aceptar una
   nueva clave válida. Tras guardar, la app cierra sesión y muestra confirmación
   en el login.
4. **Recuperación:** desde el login solicite instrucciones con el correo de
   prueba y compruebe la respuesta de la interfaz y la recepción del mensaje en
   el buzón controlado. La interfaz actual no implementa el formulario final de
   cambio desde el enlace, como se detalla en la configuración de Auth.
5. **Aislamiento RLS:** use sesiones separadas de provincial, recinto y
   veedores de recintos/JRV diferentes. Compruebe que provincial consulta el
   consolidado; un recinto solo consulta/actualiza su propio recinto; un veedor
   solo ve y modifica sus JRV asignadas. Repita con una JRV ajena y confirme que
   la consulta/escritura se deniega o no devuelve filas. No use la clave
   `service_role` para esta prueba, porque omitiría el modelo de permisos del
   cliente.
6. **Registro y corrección de actas:** con el veedor, seleccione una JRV y
   pruebe ambas dignidades. Registre cinco valores de organización, blancos,
   nulos y sufragantes; pruebe una suma incorrecta y confirme que no permite
   guardar. Capture una imagen enfocada y compruebe la vista previa, nitidez
   (umbral mínimo configurado: 100) y coordenadas GPS. En Android conceda cámara
   y ubicación cuando se soliciten.
   Verifique que el objeto queda en el bucket privado `actas`. Con el
   coordinador de recinto, corrija valores y, si es necesario, reemplace la
   imagen JPEG/PNG (máximo 10 MB); también compruebe la opción de conservar la
   foto existente.
7. **Consolidado provincial:** registre actas de prueba para ambas dignidades y
   revise el dashboard provincial, filtros por recinto/dignidad y sumas por
   candidatura. Compruebe el avance de actas y los enlaces GPS cuando existan
   coordenadas.
8. **Cierre de sesión:** use **Salir** desde cada panel principal y confirme
   que la sesión termina y se vuelve a `/auth/login`. Recargue con F5 una ruta
   protegida con una sesión válida para comprobar que se restaura el rol.

## 6. Uso de inteligencia artificial

Los ADR registran el uso de Gemini/Microsoft Copilot como apoyo para comparar
alternativas tecnológicas, investigar validadores y patrones de arquitectura,
y evaluar la captura de cámara/GPS y el alcance offline. También registran la
aceptación y deliberación humana del equipo para las decisiones adoptadas.

Durante la preparación de esta entrega se utilizó Copilot en VS Code para
inspeccionar el código y redactar esta documentación. La información se
contrastó con los manifiestos, servicios, páginas, SQL, Edge Functions, pruebas
y ADR presentes en el repositorio. Las sugerencias de IA no sustituyen la
revisión del equipo: antes de una entrega, pruebe los flujos con cuentas y
datos ficticios, ejecute build, pruebas y verificaciones manuales de RLS en el
proyecto Supabase de prueba.
