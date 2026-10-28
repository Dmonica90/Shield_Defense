# SCORM 2004 4th Edition

Los archivos de `2004-4th/` son copia **sin cambios** de
[jeffbatt01/scorm-drivers](https://github.com/jeffbatt01/scorm-drivers), commit
`c1dd067`. No se editan: para actualizar, se reemplazan por la versión nueva del repo.

- `core/scorm-driver.js` — el driver (el global `SCORM`). Va en el paquete.
- `core/mock-api.js` — API simulada para probar en un navegador sin LMS. **No** va en el paquete.
- `launcher.html` — lo que abre el LMS; redirige a `scormcontent/index.html`.
- `imsmanifest.xml` — plantilla. `scripts/package-scorm.mjs` solo cambia el título, el
  identificador y la lista de archivos.
- `CONTENT_AUTHOR_GUIDE.md` — referencia de la API.

## Generar el paquete

```bash
npm run package:scorm   # → ../clip-shield-defense-scorm2004.zip (raíz del repo)
```

El seguimiento (qué se reporta a `cmi.*`) está en `src/tracking/scorm.ts`.
