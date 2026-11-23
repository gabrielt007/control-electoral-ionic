# ADR-006: Alcance de Conectividad: Priorización de requisitos obligatorios (R1–R9) y soporte Offline opcional (R10)

## Estado
Aceptado (como mejora opcional fuera del alcance obligatorio)

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz — Grupo 3

## Requisitos relacionados
R1–R9 (Obligatorios), R10 (Conectividad, persistencia local y sincronización automática opcional con bonificación).

## Contexto
El requisito `R10` plantea persistencia local, sincronización automática de registros pendientes al recuperar conexión y estrategia de resolución de conflictos como un componente opcional con bonificación (hasta 2,1 puntos dentro del componente aplicación, sin superar `14/14`). Dado el plazo estricto de entrega (miércoles 25 de noviembre a las 14:00), el equipo evaluó el impacto técnico y de tiempo de incorporar sincronización offline completa de actas e imágenes.

## Alternativas consideradas

| Alternativa | Ventajas para este caso | Desventajas / riesgos |
| :--- | :--- | :--- |
| **Enfoque Online-First prioritario (`R1–R9`) y `R10` diferido como mejora opcional** | Asegura la entrega completa, estable y verificada de los nueve requisitos obligatorios y la APK dentro del plazo, evitando riesgos de sincronización parcial de imágenes. | No permite registrar actas sin conectividad a Internet en la versión base ni optar por la bonificación de `R10` salvo que quede tiempo sobrante. |
| **Arquitectura Offline-First obligatoria (`IndexedDB` + `Capacitor Network` + `Capacitor Filesystem`)** | Permite almacenar actas e imágenes temporalmente sin conexión y sincronizarlas al recuperar red. | Alto costo de implementación, pruebas y estabilización (encolado de archivos binarios en Storage y resolución de conflictos), poniendo en riesgo el cumplimiento de `R1–R9`. |

## Decisión
Se acepta el ADR **únicamente como mejora futura y opcional** (fuera del alcance obligatorio de la línea base).
Condiciones técnicas:
* Priorizar al 100 % la implementación, pruebas y estabilización de los requisitos obligatorios `R1–R9`.
* Implementar `IndexedDB`, `Capacitor Network` y sincronización diferida solo si cada integrante finaliza `R1–R9` con tiempo disponible.
* Mantener la funcionalidad offline fuera del alcance obligatorio actual, gestionando mensajes claros ante pérdida de red (`R9`).

## Consecuencias
* **Beneficios:** Mitiga el riesgo de entregas incompletas o fallos críticos en la defensa presencial y asegura la calidad de los 14 puntos obligatorios.
* **Obligaciones:** Manejar de forma controlada los errores de falta de conexión en la interfaz (`R9`).
* **Limitaciones y riesgo:** Dependencia de conectividad activa durante el registro de actas; asumido conscientemente por el equipo para garantizar el cumplimiento puntual.

## Verificación
* Cumplimiento íntegro y probado de `R1–R9` en el repositorio y APK.
* Manejo controlado de error de red cuando el dispositivo no tiene conexión.

## Uso de IA
* **Herramienta:** Gemini / Microsoft Copilot.
* **Consulta realizada:** Evaluación de viabilidad y riesgos de implementar cola offline con imágenes vs. priorizar R1–R9 en el plazo de evaluación.
* **Aceptación/rechazo y verificación humana:** Aceptado tras analizar la ponderación de la rúbrica y los tiempos reales del equipo.

## Trazabilidad
* Commit de ADR: `[Enlace o hash al commit en docs/adr/ADR-006-soporte-offline-opcional.md]`
* Commit de implementación: `[N/A en línea base o commit de extensión si aplica]`

## Consenso del equipo
* **Emilia Alejandra Tana Puga:** Propuso `IndexedDB` y `Capacitor Network` para almacenamiento temporal y sincronización posterior evitando pérdida de datos sin Internet.
* **Alex Mateo Barba Gavidia:** Consideró útil la propuesta para recintos sin señal, pero señaló que debe hacerse solo si los nueve requisitos obligatorios ya están terminados.
* **Gabriel Emilio Toaquiza Saenz:** Coincidió en su viabilidad técnica, pero opinó que el enfoque online es más realista para el tiempo disponible y sugirió dejarlo como mejora futura.
* **Objeciones y acuerdo final:** Se identificó el riesgo de tiempo insuficiente para estabilizar offline; aprobado como mejora opcional fuera del alcance obligatorio. Minuto del video: **30:49 – 36:33**.