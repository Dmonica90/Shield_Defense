# Clip Shield Defense

**False Security — First Line of Defense.** Un micro-learning interactivo de
10–12 minutos que entrena a los empleados de Clip en decisiones de seguridad
Zero Trust: cuándo escalar un problema, no cómo resolverlo.

```
app/   El curso. React + Vite + TypeScript, compilado como sitio estático.
```

Todo el detalle —cómo correrlo, la arquitectura, las reglas y cómo editar el
guion— está en [`app/README.md`](app/README.md).

```bash
cd app
npm install
npm run dev
```

`npm run build` genera un sitio estático en `app/dist/`.

## Publicación

`.github/workflows/deploy.yml` corre los tests y el build en cada pull request, y
en cada push a `main` además publica el sitio en GitHub Pages. Para que el deploy
funcione, **Settings → Pages → Source** debe estar en **GitHub Actions**. GitHub
Pages en repositorios privados requiere un plan de pago de GitHub.

El destino final es Workday vía SCORM; ver "Siguiente paso: SCORM" en
[`app/README.md`](app/README.md).

## Origen

El proyecto parte de la base de
[Zero-Trust](https://github.com/Dmonica90/Zero-Trust) ("The Infiltrator"): misma
arquitectura (reducer puro, guion en JSON validado por tests, una pantalla por
fase). El contenido, las reglas y las pantallas son nuevos; se conservaron los
componentes de interfaz y los efectos de sonido.
