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

**Las escenas son ilustraciones SVG.** Cada área tiene su cuarto dibujado en
`components/SceneArt.tsx` (línea plana, crema, naranja y azul marino); las
posiciones de los hotspots están en `src/scene.ts` y caen sobre objetos del
dibujo, así que si mueves un objeto mueve también su slot.

## SCORM 2004 para Workday

```bash
npm run package:scorm   # → ../clip-shield-defense-scorm2004.zip (SCORM 2004 4th Edition)
```

El ZIP queda en la raíz del repo y en Workday se ve como "Clip Shield Defense:
False Security — Data Loss Prevention (DLP)".

El ZIP también se genera en cada ejecución de GitHub Actions (artefacto
`clip-shield-defense-scorm2004`). Usa el driver de
[jeffbatt01/scorm-drivers](https://github.com/jeffbatt01/scorm-drivers) sin
modificar (`scorm/`); lo propio del curso está en `src/tracking/scorm.ts`.

| Qué pasa en el juego | Qué recibe Workday |
| --- | --- |
| Se abre | `Initialize`; el nombre del certificado sale de `cmi.learner_name` |
| Cada paso | `cmi.location`, `cmi.suspend_data` (la partida), `completion_status = incomplete` |
| Cada decisión | `cmi.interactions.n` tipo `choice`: respuesta, correcta, resultado, latencia |
| Consola verifica un área | `cmi.objectives.n` por área (passed/failed) y `cmi.progress_measure` |
| Evaluación | reflexión como `long-fill-in` (texto completo); V/F del DLP como `true-false` |
| Certificado | `cmi.score` (100 / 85 / 70 según fallos), luego `completed` + `passed` |
| Game Over | queda `incomplete` y sin partida guardada: al reabrir empieza de cero |
| Cierra la ventana | `cmi.session_time`, `cmi.exit` (`suspend` o `normal`), `Terminate` |

Al volver a abrirlo con una partida a medias (`cmi.entry = resume`) ofrece
«Continuar donde me quedé» con lo que guardó el LMS. Dentro del LMS no aparece el
aviso «¿salir del sitio?», y la sesión se cierra también con `pagehide`, que es el
evento que sí llega en iOS (app móvil de Workday).

`e2e/scorm.spec.ts` abre el paquete como lo hace Workday en escritorio (ventana
nueva desde la página del LMS) y comprueba todo lo anterior. Antes de subirlo a
Workday conviene probarlo gratis en [SCORM Cloud](https://cloud.scorm.com).

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
- En pantallas angostas la escena lleva marcadores numerados y debajo una lista de hotspots con los mismos números.
