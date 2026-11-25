# ADR-001: Elección de Ionic Angular (Standalone) como framework frontend móvil

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz — Grupo 3

## Requisitos relacionados
R1, R2, R3, R4, R5, R6, R7, R8, R9 (Estructura de aplicación móvil, control de acceso por roles mediante Guards, formularios reactivos de escrutinio y compilación Android con Capacitor).

## Contexto
Se requiere desarrollar una aplicación móvil instalable en Android (APK) mediante Capacitor para gestionar el escrutinio electoral con tres roles diferenciados (Coordinador Provincial, Coordinador de Recinto y Veedor de Mesa), validaciones estrictas de negocio y separación clara entre presentación, lógica y persistencia (`R9`), dentro de un plazo de desarrollo individual de cuatro días.

## Alternativas consideradas

| Alternativa | Ventajas para este caso | Desventajas / riesgos |
| :--- | :--- | :--- |
| **Ionic Angular (Standalone)** | Tecnología dominada previamente por el equipo en la asignatura; incluye de forma nativa formularios reactivos, Route Guards para proteger vistas por rol y servicios inyectables para separar capas. | Curva de configuración inicial para integrantes con menor práctica y necesidad de controlar compatibilidad de versiones entre Node, Ionic y Angular CLI. |
| **Ionic React** | Sintaxis declarativa basada en JSX y menor cantidad de archivos estructurales por pantalla. | Menor familiaridad del equipo; carece de una arquitectura opinada por defecto (requiere librerías externas para formularios y guards), elevando el riesgo de retrasos e inconsistencias entre los tres repositorios. |

## Decisión
Se elige **Ionic Angular con componentes Standalone** y Capacitor.
Condiciones técnicas obligatorias:
* Separar estrictamente componentes visuales y servicios.
* Mantener versiones compatibles de Node, Ionic y Angular CLI entre los integrantes.
* Definir una estructura mínima común de carpetas para todo el equipo.

## Consecuencias
* **Beneficios:** Homogeneidad estructural entre los tres repositorios individuales, protección declarativa de rutas por rol y aprovechamiento del conocimiento previo del equipo.
* **Obligaciones:** Usar componentes `standalone: true` y respetar la estructura de carpetas acordada.
* **Limitaciones y riesgo:** Posibles conflictos de dependencias si algún integrante instala versiones dispares de Node/Angular CLI; mitigado estandarizando versiones en el README.

## Verificación
* Archivo `package.json` con `@ionic/angular` y `@capacitor/core`.
* Ejecución exitosa de `ionic build` y `npx cap sync android` generando un APK funcional instalable.

## Uso de IA
* **Herramienta:** Gemini / Microsoft Copilot.
* **Consulta realizada:** Contraste técnico entre Ionic Angular Standalone e Ionic React para el caso electoral y síntesis de deliberación.
* **Aceptación/rechazo y verificación humana:** Aceptado tras validar compatibilidad con requisitos R8–R9 y experiencia del grupo.

## Trazabilidad
* Commit de ADR: `900fd86` — agregó `docs/adr/ADR-001-framework-ionic-angular.md`.
* Commit de implementación: `900fd86` — inicializó Ionic Angular y Capacitor en `package.json`, `angular.json`, `capacitor.config.ts`, `src/main.ts` y `src/app/app.routes.ts`.

## Consenso del equipo
* **Alex Mateo Barba Gavidia:** Propuso Angular Standalone destacando el dominio previo en el curso, formularios reactivos, guards por rol, servicios para R9 y mitigación de curva inicial mediante estructura común.
* **Gabriel Emilio Toaquiza Saenz:** Apoyó Angular por la experiencia adquirida en la materia, señalando que React implicaría incorporar una herramienta menos familiar.
* **Emilia Alejandra Tana Puga:** Apoyó Angular por formar parte del conocimiento previo del equipo, evitando aprender React desde cero.
* **Objeciones y acuerdo final:** Se evaluó React y el riesgo de versiones incompatibles; aprobado por unanimidad. Minuto del video: **00:32 – 04:11**.