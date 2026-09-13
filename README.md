# MakiDraw

A small drawing app, built one step at a time to learn web development.

Choose a line, rectangle, ellipse, or text from the toolbar. Draw geometric
shapes by clicking two points, or press, drag, and release. Select existing
shapes to move them or change their order. Completed drawings are encoded in
the URL, so refreshing or sharing the full URL recreates the drawing.

Live app: <https://makidraw-production.up.railway.app/>

## Run locally

Use Node.js 22.12+ (Node 20.19+ also works) and npm.

Install the dependencies once:

```sh
npm install
```

Run the backend in one terminal:

```sh
AI_ACCESS_TOKEN=your-secret-token npm run dev:server
```

Run the frontend in another terminal:

```sh
npm run dev
```

Open the URL printed by Vite. Vite updates the page when frontend files change
and proxies `/api` requests to the Express server. `tsx watch` restarts Express
when backend files change. On the first AI edit, enter the same access token in
the browser; MakiDraw saves it in `sessionStorage` for that browser tab.

## API

`GET /api/health` returns a small JSON response showing that the server is
running. The deployed endpoint is
<https://makidraw-production.up.railway.app/api/health>.

The backend does not store drawings yet. Drawing data still lives in the URL.

## What each file does

- `index.html` defines the page content and loads the TypeScript entry point.
- `src/main.ts` coordinates drawing state and browser interactions.
- `src/canvas-renderer.ts` draws shapes and selection feedback on the canvas.
- `src/drawing-style.ts` stores shared visual settings for canvas drawings.
- `src/model.ts` defines the drawing concepts shared by the app.
- `src/shape-geometry.ts` handles selecting and moving shapes.
- `src/drawing-url.ts` validates old URL formats and saves the current format.
- `src/style.css` controls the page's appearance.
- `server/index.ts` defines the Express API and serves the built frontend.
- `tsconfig.json` configures TypeScript checks for the frontend.
- `tsconfig.server.json` configures compilation for the backend.
- `vite.config.ts` configures Vite and the development API proxy.
- `.github/workflows/deploy.yml` builds the frontend for GitHub Pages.

## Production build

```sh
npm run build
npm start
```

The build checks and bundles the frontend into `dist/`, then compiles the
backend into `server-dist/`. The start command runs the compiled Express server,
which serves both the app and API at <http://localhost:3000> by default.

## Deployment

Railway is the primary deployment. It builds the app with `npm run build` and
starts it with `npm start`. The server listens on Railway's `PORT` environment
variable and on `0.0.0.0`. Pushes to the connected `main` branch trigger new
deployments. The `AI_ACCESS_TOKEN` Railway variable protects the AI edit API and
must not use the `VITE_` prefix, which would expose it to frontend code.

GitHub Pages remains available as a frontend-only deployment at
<https://yashining.github.io/makidraw/>. Its GitHub Actions workflow uses
`npm run build:pages` so assets use the required `/makidraw/` URL prefix.
