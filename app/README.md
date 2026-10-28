# Clip Shield Defense — el curso

## Correrlo

```bash
npm install
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | Typecheck y build a `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm test` | Reglas del juego, guion y tracking (Vitest) |
| `npm run e2e` | Partidas completas en navegador (Playwright) |

Agrega `?fast=1` a la URL para acortar los tiempos fijos (carga, consola,
debriefing) y congelar la lluvia binaria (sin distorsión); los tests e2e lo usan.

## Cómo se juega

1. **Carga → intro → 5 principios.** La intro es una narración animada; si se
   agrega `public/assets/video/intro.mp4` se reproduce ese video en su lugar.
2. **4 áreas** (Centro de Atención, Desarrollo, Finanzas, Operaciones), en
   cualquier orden. Cada una: situación → explorar la escena (hotspots) →
   "¿Qué haces?" con 3 opciones → **fragmento obtenido**.
3. **Cada decisión entrega un fragmento, sea correcta o no**, y no hay feedback:
   la pantalla es idéntica. Esa es la "falsa seguridad".
4. **Consola Central:** al terminar la ronda verifica los 4 fragmentos.
   - Todos genuinos → protocolo activado → debriefing.
   - Alguno falso → **+1 fallo** y pantalla "No lograste asegurar el sistema",
     que muestra —solo aquí— lo que elegiste, sus consecuencias y por qué.
     Regresas a jugar **solo las áreas con fragmento falso**.
5. **La ronda es la dificultad:** ronda 1 = ciclo 1 = fácil, ronda 2 = ciclo 2 =
   intermedio (la señal se distorsiona y entra una lluvia binaria leve),
   ronda 3 = ciclo 3 = difícil (lluvia binaria densa con ráfagas de distorsión
   de señal, más hotspots y un giro).
6. **3 fallos = Game Over** (reintentar reinicia todo). Se gana con 0, 1 o 2.
7. **Debriefing** (6 tarjetas) → **evaluación** (reflexión abierta de 50–500
   caracteres o saltar; V/F sobre el DLP, donde "Falso" es requerido) →
   **certificado** (descargable como PDF con el diálogo de impresión).

El progreso se guarda en el navegador en cada paso: al recargar se ofrece
"Continuar donde me quedé". Tras 15 minutos sin actividad la sesión se pausa, y
cerrar la pestaña a media partida pide confirmación.

## Cómo está hecho

```
src/
  game/machine.ts         Reducer puro: fases, rondas, fragmentos, fallos
  content/story.es.json   Todo el guion (un archivo por idioma)
  content/schema.ts       Tipos + validador estructural que corren los tests
  tracking/events.ts      Transiciones del reducer → eventos de tracking
  tracking/reporter.ts    Interfaz hacia el LMS (hoy: consola)
  tracking/progress.ts    Checkpoint en localStorage
  screens/                Una pantalla por fase
  components/             HUD, escena del área, fragmentos, UI base
```

**El contenido es data.** Todo lo que el jugador lee está en `story.es.json`:
situaciones, hotspots, opciones, consecuencias, debriefing, certificado. Los
tests fallan si un ciclo no tiene exactamente una opción correcta, si falta un
texto, o si la cantidad de hotspots no sigue la escalada 3 → 4–5 → 5. En el
guion la opción correcta puede ir en cualquier letra: el juego las **baraja** por
partida, así "elegir siempre la A" no funciona.

**La lógica es pura.** `game/machine.ts` no importa React ni textos: si una
opción es correcta llega en la acción. Las reglas se prueban con tests unitarios,
no haciendo clic.

**El arte es provisional.** Las escenas de cada área están dibujadas en SVG
(`components/AreaScene.tsx`) hasta tener ilustraciones de Clip; las posiciones
de los hotspots están en `src/scene.ts`.

## SCORM (Workday)

```sh
npm run package:scorm
```

Genera `scorm/clip-shield-defense-scorm2004-4th.zip`, el paquete SCORM 2004
4th Edition para subir a Workday (y `scorm/package/`, la misma carpeta sin
comprimir). El script baja el driver de
[jeffbatt01/scorm-drivers](https://github.com/jeffbatt01/scorm-drivers) en cada
corrida y lo copia sin cambios; del `imsmanifest.xml` solo cambia el título, que
en Workday se ve como "Clip Shield Defense: False Security — Data Loss
Prevention (DLP)".

El juego no sabe nada de SCORM: `src/tracking/scormReporter.ts` es un segundo
`Reporter` que se usa cuando la página carga el driver.

| `Reporter` | SCORM 2004 |
| --- | --- |
| `start()` / `learnerName()` | `Initialize`, `cmi.learner_name` ("Apellido, Nombre" → "Nombre Apellido") |
| `savedProgress()` | `cmi.suspend_data`, solo si `cmi.entry` es `resume` |
| `event(e)` | `cmi.interactions.n.*`: decisiones (choice) y las dos preguntas de evaluación |
| `saveProgress(state)` | `cmi.location` (la fase), `cmi.suspend_data` (el estado), `Commit` |
| `complete({ score, passed })` | `cmi.score.*` (100/0) y luego `completed` + `passed`/`failed` |
| `finish()` | `cmi.session_time` y luego `Terminate`; también al cerrar la ventana |

Para probarlo sin LMS: en `scorm/package/scormcontent/index.html` descomenta
la línea de `mock-api.js`, copia ese archivo del repo de drivers a
`scorm/package/core/`, sirve `scorm/package/` y abre `launcher.html`. Las
llamadas aparecen en la consola. Antes de Workday conviene subir el ZIP a
[SCORM Cloud](https://cloud.scorm.com).

## Storyline (revisión)

Para revisar el curso dentro de Articulate Storyline como Web Object (no
reporta nada a Storyline ni al LMS):

```sh
npm run build:storyline
```

Genera `storyline/ClipShieldDefense/`: un `index.html` con todo el JS y CSS
incrustado (abre también desde `file://`) más `assets/audio/`. En Storyline:
*Insert → Web Object*, elegir esa carpeta, *Display in slide*, y estirarlo a
toda la diapositiva (16:9, 1280×720). Dentro del iframe no aparece el aviso de
"¿salir de la página?".

## Accesibilidad

- Toda interacción es un botón real: clic, toque y Enter funcionan. Hay una
  partida completa solo con teclado en los tests e2e.
- Las opciones son un `radiogroup`; los hotspots explorados se anuncian como tales.
- Los diálogos atrapan el foco y cierran con Escape.
- `prefers-reduced-motion` desactiva las animaciones y la distorsión, y deja la lluvia binaria quieta.
- En pantallas angostas la escena se reemplaza por una lista de hotspots.
