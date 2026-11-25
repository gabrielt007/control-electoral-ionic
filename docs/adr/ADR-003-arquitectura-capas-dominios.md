# ADR-003: Arquitectura de aplicación por capas y dominios (Core, Shared, Features)

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz — Grupo 3

## Requisitos relacionados
R4, R5, R6, R8, R9 (Separación explícita entre presentación, lógica de negocio y acceso a datos; modularización por roles y trazabilidad arquitectónica).

## Contexto
La aplicación contempla flujos aislados para tres roles (Coordinador Provincial, Coordinador de Recinto y Veedor), además de servicios transversales (autenticación, almacenamiento, cámara y GPS). Invocar directamente al cliente de Supabase desde los componentes visuales violaría el requisito `R9` de separación de capas y dificultaría la defensa individual.

## Alternativas consideradas

| Alternativa | Ventajas para este caso | Desventajas / riesgos |
| :--- | :--- | :--- |
| **Arquitectura por dominios y capas (`Core`, `Shared`, `Features`)** | Aísla presentación (`pages`), lógica de negocio (`services`/`validators`) y acceso a datos (`models`/repositorios); organiza los módulos por rol/flujo y evita llamadas directas al backend desde las páginas. | Genera una mayor cantidad de carpetas y archivos, exigiendo disciplina en convenciones de nombres. |
| **Estructura plana global (`pages/` y `services/` generales)** | Rapidez inicial con pocos directorios. | Mezcla vistas y servicios de los tres roles en carpetas globales, aumentando el acoplamiento y dificultando la trazabilidad en la defensa. |

## Decisión
Se adopta una **arquitectura por dominios y capas** bajo `src/app/`:
* **`core/`**: Servicios transversales (`auth`, `storage`, `cámara`, `GPS`, `guards` y modelos).
* **`shared/`**: Componentes visuales reutilizables y validadores puros.
* **`features/`**: Módulos aislados por flujo/rol (`auth`, `provincial`, `recinto`, `veedor`).
* **Regla estricta:** Ningún archivo `*.page.ts` podrá acceder directamente a Supabase (ni Firebase).

## Consecuencias
* **Beneficios:** Cumplimiento estricto de `R9`, bajo acoplamiento, facilidad de crecimiento y trazabilidad inmediata durante la defensa presencial.
* **Obligaciones:** Encapsular toda consulta a Supabase dentro de servicios dedicados.
* **Limitaciones y riesgo:** Mayor número de archivos y carpetas; mitigado manteniendo una convención uniforme en los tres repositorios.

## Verificación
* Inspección de la estructura de carpetas `src/app/core`, `src/app/shared` y `src/app/features`.
* Auditoría estática comprobando que ningún archivo `*.page.ts` importe directamente `@supabase/supabase-js`.

## Uso de IA
* **Herramienta:** Gemini / Microsoft Copilot.
* **Consulta realizada:** Organización modular en capas para Ionic Angular Standalone con tres roles y backend desacoplado.
* **Aceptación/rechazo y verificación humana:** Aceptado y adaptado a la regla de prohibición de llamadas directas al backend desde páginas.

## Trazabilidad
* Commit de ADR: `900fd86` — agregó `docs/adr/ADR-003-arquitectura-capas-dominios.md`.
* Commits de implementación:
  * `ecb51f7` — modelos de dominio en `src/app/core/models/`.
  * `2a5311d` — servicios transversales en `src/app/core/services/`.
  * `7d162d2` — guards y manejo de errores en `src/app/core/guards/` y `src/app/core/services/error-handler.service.ts`.
  * `57f4170` y `a0a64eb` — servicios y páginas organizados por dominio en `src/app/features/recinto/` y `src/app/features/veedor/`.

## Consenso del equipo
* **Gabriel Emilio Toaquiza Saenz:** Presentó la propuesta destacando trazabilidad, bajo acoplamiento, prohibición de acceso directo al backend desde páginas y alineación con R4, R5, R6, R8 y R9.
* **Alex Mateo Barba Gavidia:** Apoyó la organización por capas señalando que facilita la trazabilidad y el manejo de los tres roles.
* **Emilia Alejandra Tana Puga:** Señaló que facilita el seguimiento y desarrollo de requisitos, considerándola accesible para el equipo.
* **Objeciones y acuerdo final:** Se identificó el riesgo de mayor cantidad de archivos y la necesidad de disciplina; aprobado por unanimidad. Minuto del video: **10:09 – 18:28**.