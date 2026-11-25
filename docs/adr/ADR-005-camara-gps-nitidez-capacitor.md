# ADR-005: Captura de Cámara, Geolocalización GPS y validación local de nitidez mediante Capacitor

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz — Grupo 3

## Requisitos relacionados
R4, R5, R7, R9 (Captura fotográfica de cada acta desde la app, comprobación de nitidez antes de aceptarla, registro de coordenadas GPS y gestión de permisos y errores de hardware).

## Contexto
El veedor debe capturar la fotografía del acta física directamente desde la aplicación móvil (`R7`), verificar su nitidez antes de aceptarla para evitar evidencias borrosas, registrar las coordenadas GPS del lugar de captura y manejar adecuadamente denegaciones de permisos o errores de sensores en Android.

## Alternativas consideradas

| Alternativa | Ventajas para este caso | Desventajas / riesgos |
| :--- | :--- | :--- |
| **Plugins oficiales `@capacitor/camera` y `@capacitor/geolocation` + análisis local en HTML5 Canvas (varianza del Laplaciano)** | Soporte oficial para Android, gestión nativa de permisos, captura directa desde cámara y evaluación instantánea de nitidez en cliente sin requerir conexión a Internet ni servicios externos. | Requiere configurar permisos en `AndroidManifest.xml` y calibrar experimentalmente el umbral mínimo de aceptación de nitidez. |
| **Apache Cordova** | Historial amplio en aplicaciones híbridas antiguas. | Ecosistema legado frente a Capacitor con mayores problemas de compatibilidad en versiones actuales de Android SDK y Gradle. |
| **Plugins comunitarios de terceros o APIs externas de visión** | Algunas librerías ofrecen funciones preconstruidas. | Dependencia de terceros sin mantenimiento garantizado o latencia/consumo de red en recintos electorales. |

## Decisión
Se elige el uso exclusivo de los plugins oficiales **`@capacitor/camera`** y **`@capacitor/geolocation`**, junto con **validación local de nitidez mediante HTML5 Canvas** y cálculo de varianza del operador Laplaciano.
Condiciones técnicas:
* Sin dependencias externas ni APIs remotas para análisis de imágenes.
* Validación local de nitidez previa al guardado.
* Definición experimental de un umbral de aceptación mediante pruebas reales.
* Gestión explícita de permisos y errores de cámara/GPS.

## Consecuencias
* **Beneficios:** Evita subir actas ilegibles, funciona offline en el dispositivo sin costos externos y garantiza compatibilidad nativa en Android.
* **Obligaciones:** Declarar permisos de cámara y ubicación en `AndroidManifest.xml` y rechazar fotografías por debajo del umbral de nitidez.
* **Limitaciones y riesgo:** Variación de iluminación en recintos que afecte el puntaje de nitidez; mitigado calibrando el umbral con fotografías reales de prueba.

## Verificación
* Servicio de cámara y GPS en `src/app/core/services/` y permisos en `AndroidManifest.xml`.
* Prueba en dispositivo/emulador capturando una foto movida (rechazada) y una foto nítida (aceptada con latitud y longitud guardadas).

## Uso de IA
* **Herramienta:** Gemini / Microsoft Copilot.
* **Consulta realizada:** Validación local de nitidez de imágenes en Ionic Capacitor mediante Canvas y varianza del Laplaciano.
* **Aceptación/rechazo y verificación humana:** Aceptado tras comprobar que no requiere librerías externas y opera sin Internet.

## Trazabilidad
* Commit de ADR: `900fd86` — agregó `docs/adr/ADR-005-camara-gps-nitidez-capacitor.md`.
* Commits de implementación:
  * `aa34077` — cámara, GPS, análisis de nitidez y pruebas en `src/app/core/services/camera-gps.service.ts` y `src/app/core/services/camera-gps.service.spec.ts`.
  * `a0a64eb` — integración del registro de actas, almacenamiento de fotos y GPS en `src/app/features/veedor/` y `supabase/storage_actas.sql`.
  * `57f4170` — corrección de actas y reemplazo de foto por el coordinador en `src/app/features/recinto/` y `supabase/recinto_coordinador.sql`.

## Consenso del equipo
* **Emilia Alejandra Tana Puga:** Presentó la propuesta defendiendo plugins oficiales de Capacitor y validación local de nitidez con Canvas y varianza del Laplaciano sin Internet ni servicios externos.
* **Alex Mateo Barba Gavidia:** Apoyó Capacitor y el cálculo local sin librerías extra, proponiendo definir experimentalmente el umbral de aceptación.
* **Gabriel Emilio Toaquiza Saenz:** Coincidió en que Capacitor es la opción adecuada y en calibrar el umbral tras pruebas.
* **Objeciones y acuerdo final:** Se consultó si Capacitor bastaba para nitidez y cómo fijar el umbral; aprobado por unanimidad. Minuto del video: **26:43 – 30:49**.