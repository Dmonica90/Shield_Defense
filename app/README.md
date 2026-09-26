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
debriefing) y congelar el glitch; los tests e2e lo usan.

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
   intermedio (glitch leve), ronda 3 = ciclo 3 = difícil (glitch fuerte, más
   hotspots y un giro).
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

## Siguiente paso: SCORM

El curso ya emite todos los eventos que Workday necesita, pero hoy van a la
consola (en desarrollo) o a ningún lado (en producción). Conectarlo es escribir
un segundo `Reporter` (`src/tracking/reporter.ts`), sin tocar el juego:

| `Reporter` | SCORM 2004 |
| --- | --- |
| `start()` / `learnerName()` | `Initialize`, `cmi.learner_name`, `cmi.suspend_data` |
| `event(e)` | `cmi.interactions.n.*` (decisiones, hotspots, evaluación), `cmi.objectives.n.*` (fragmentos) |
| `saveProgress(state)` | `cmi.suspend_data`, `cmi.location`, `Commit` |
| `complete({ score, passed })` | `cmi.score.*`, `cmi.completion_status`, `cmi.success_status` |
| `finish()` | `cmi.session_time`, `cmi.exit`, `Terminate` |

Faltaría además generar `imsmanifest.xml` y el `.zip` para subir a Workday. El
build ya usa rutas relativas (`base: './'`), así que funciona dentro del iframe
del LMS.

## Accesibilidad

- Toda interacción es un botón real: clic, toque y Enter funcionan. Hay una
  partida completa solo con teclado en los tests e2e.
- Las opciones son un `radiogroup`; los hotspots explorados se anuncian como tales.
- Los diálogos atrapan el foco y cierran con Escape.
- `prefers-reduced-motion` desactiva las animaciones y el glitch.
- En pantallas angostas la escena se reemplaza por una lista de hotspots.
