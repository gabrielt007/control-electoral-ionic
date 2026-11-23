# ADR-002: Selección de Supabase como plataforma Backend, Base de Datos y Seguridad

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz — Grupo 3

## Requisitos relacionados
R1, R2, R3, R4, R5, R6, R7, R8 (Modelo jerárquico provincia-cantón-recinto-JRV-actas, creación jerárquica de cuentas, cambio de clave y recuperación por correo, almacenamiento de fotos y reglas de seguridad por rol y pertenencia).

## Contexto
El sistema gestiona entidades relacionales (provincias, cantones, recintos, JRV, candidaturas, usuarios con jerarquía de tres niveles y actas con votos por organización), exige reglas estrictas de acceso en el servidor para impedir que un veedor acceda a mesas ajenas (`R8`), requiere almacenamiento de imágenes de actas (`R7`) y prohíbe exponer claves administrativas en el cliente (`R3`).

## Alternativas consideradas

| Alternativa | Ventajas para este caso | Desventajas / riesgos |
| :--- | :--- | :--- |
| **Supabase (PostgreSQL + Auth + RLS + Storage)** | Motor relacional PostgreSQL ideal para integridad referencial (recintos, mesas, actas, votos) y consultas SQL agregadas para el dashboard (`R4`); Row Level Security (RLS) nativo por rol y pertenencia (`R8`); tier gratuito sin necesidad de planes de pago. | Limitación en la tasa de envío de correos transaccionales en el plan gratuito (relevante para confirmación y recuperación de contraseña en `R2`/`R3`). |
| **Firebase (Auth + Firestore + Storage)** | Conocimiento previo en parte del equipo y sincronización en tiempo real. | Modelo documental NoSQL que exige desnormalizar relaciones electorales y realizar agregaciones manuales para reportes consolidados. |
| **Appwrite** | Plataforma open-source con gestión de equipos, base de datos y storage. | Menor familiaridad del equipo y mayor sobrecarga de configuración frente al tiempo disponible. |

## Decisión
Se elige **Supabase** como backend principal (PostgreSQL, Supabase Auth, Row Level Security y Supabase Storage).
Condiciones técnicas obligatorias:
* Versionar el esquema SQL y las políticas RLS en el repositorio.
* No incluir claves administrativas (`service_role`) en la aplicación Ionic.
* Utilizar únicamente credenciales públicas permitidas (URL + `anon key`).
* Considerar un servicio SMTP externo si los límites de correo gratuito afectan las pruebas.

## Consecuencias
* **Beneficios:** Integridad relacional nativa, consultas SQL directas para dashboards consolidados (`R4`), seguridad real en base de datos mediante políticas RLS (`R8`) y cero costos de licenciamiento.
* **Obligaciones:** Definir y versionar scripts SQL de tablas y políticas RLS en el repositorio.
* **Limitaciones y riesgo:** Límite de envío de correos por hora en Supabase Auth; mitigado configurando SMTP externo o gestionando pruebas controladas.

## Verificación
* Scripts SQL y políticas RLS versionados en el repositorio.
* Prueba de acceso desde sesión de Veedor A intentando consultar/editar una JRV del Veedor B verificando bloqueo por RLS (`R8`).
* Verificación de carga de imagen de acta en bucket de Supabase Storage.

## Uso de IA
* **Herramienta:** Gemini / Microsoft Copilot.
* **Consulta realizada:** Comparativa relacional y de seguridad RLS entre Supabase, Firebase y Appwrite para escrutinio electoral.
* **Aceptación/rechazo y verificación humana:** Aceptado tras contrastar consultas SQL del dashboard y políticas RLS exigidas por R8.

## Trazabilidad
* Commit de ADR: `[Enlace o hash al commit en docs/adr/ADR-002-backend-supabase.md]`
* Commit de implementación: `[Enlace o hash al commit de esquema SQL y cliente Supabase]`

## Consenso del equipo
* **Alex Mateo Barba Gavidia:** Propuso Supabase argumentando la naturaleza relacional de los datos, consultas SQL para el dashboard, seguridad RLS y almacenamiento gratuito, advirtiendo el límite de correos.
* **Gabriel Emilio Toaquiza Saenz:** Comentó tener mayor experiencia previa con Firebase, pero tras analizar la comparativa coincidió en que Supabase se ajusta mejor al modelo y requerimientos.
* **Emilia Alejandra Tana Puga:** Reconoció la validez de ambas opciones y apoyó Supabase por ser gratuita y evitar licenciamiento adicional.
* **Objeciones y acuerdo final:** Se analizó la limitación de correos y la alternativa Firebase; aprobado por unanimidad. Minuto del video: **04:11 – 09:30**.