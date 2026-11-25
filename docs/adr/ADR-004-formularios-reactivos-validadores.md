# ADR-004: Formularios Reactivos (Reactive Forms) y validadores puros de negocio

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz — Grupo 3

## Requisitos relacionados
R2, R3, R4, R5, R6, R9 (Validación algorítmica de cédula ecuatoriana, cuadre matemático de actas de escrutinio, cambio obligatorio de contraseña inicial y mensajes explícitos de validación).

## Contexto
El dominio electoral exige validaciones críticas antes de persistir datos:
1. Cédula ecuatoriana de 10 dígitos mediante código de provincia, tercer dígito y algoritmo módulo 10 (`R2`, `R3`).
2. Consistencia matemática en actas de Alcaldía y Prefectura donde votos de 5 organizaciones + blancos + nulos debe igualar al total de sufragantes (`R6`).
3. Bloqueo de reutilización de la clave inicial `Ecuador2026` (`R3`).

## Alternativas consideradas

| Alternativa | Ventajas para este caso | Desventajas / riesgos |
| :--- | :--- | :--- |
| **Angular Reactive Forms + validadores puros reutilizables** | Nativo en Angular sin librerías extra; permite validaciones cruzadas síncronas a nivel de `FormGroup` para el cuadre de actas, control granular de errores por campo (`R9`) y funciones puras fáciles de probar. | Requiere conversión numérica estricta al leer valores desde componentes `IonInput` para evitar concatenación de cadenas. |
| **Template-Driven Forms (`ngModel`)** | Menor configuración TypeScript en formularios simples. | Dificulta coordinar validaciones cruzadas complejas entre múltiples campos numéricos del acta y acopla la lógica de negocio a la plantilla HTML. |

## Decisión
Se elige **Angular Reactive Forms** acompañado de **validadores puros reutilizables** en `src/app/shared/validators/`:
* Validación de cédula ecuatoriana (provincia `01–24`, tercer dígito `< 6` y módulo 10).
* Validador de cuadre de actas a nivel `FormGroup`.
* Bloqueo de reutilización de contraseña inicial.
* Conversión numérica estricta y mensajes visibles de validación en UI (`R9`).

## Consecuencias
* **Beneficios:** Validación en tiempo real del cuadre de votos, cero dependencias externas adicionales y alta reutilización entre formularios de distintos roles.
* **Obligaciones:** Mostrar mensajes descriptivos de error en cada campo inválido y bloquear el envío mientras el formulario sea inválido.
* **Limitaciones y riesgo:** Interpretación de valores de `IonInput type="number"` como `string` al sumar votos; mitigado aplicando conversión explícita `Number()` antes de evaluar la sumatoria.

## Verificación
* Archivos de validadores en `src/app/shared/validators/`.
* Pruebas con cédulas válidas e inválidas y simulación de acta descuadrada comprobando bloqueo del botón guardar y mensaje explícito.

## Uso de IA
* **Herramienta:** Gemini / Microsoft Copilot.
* **Consulta realizada:** Implementación de validador módulo 10 de cédula ecuatoriana y validador cruzado `FormGroup` para cuadre de actas en Ionic Angular.
* **Aceptación/rechazo y verificación humana:** Aceptado y verificado frente a casos borde de casteo numérico en `IonInput`.

## Trazabilidad
* Commit de ADR: `900fd86` — agregó `docs/adr/ADR-004-formularios-reactivos-validadores.md`.
* Commits de implementación:
  * `518dec8` — validadores y pruebas en `src/app/shared/validators/cedula-ecuatoriana.validator.ts`, `src/app/shared/validators/cuadre-acta.validator.ts`, `src/app/shared/validators/nueva-password.validator.ts` y `src/app/shared/validators/validators.spec.ts`.
  * `67a9e88` — formularios de inicio de sesión, cambio obligatorio y solicitud de recuperación en `src/app/features/auth/pages/`.

## Consenso del equipo
* **Gabriel Emilio Toaquiza Saenz:** Expuso las validaciones críticas (cédula módulo 10, cuadre matemático de actas y cambio de clave), destacando reutilización, pruebas unitarias y control de estado.
* **Alex Mateo Barba Gavidia:** Apoyó aprovechar herramientas nativas de Angular rechazando agregar librerías externas innecesarias.
* **Emilia Alejandra Tana Puga:** Manifestó acuerdo total con la propuesta.
* **Objeciones y acuerdo final:** Se advirtió el riesgo de concatenación de strings en `IonInput` numérico, resolviéndose con casteo estricto; aprobado por unanimidad. Minuto del video: **18:28 – 25:06**.