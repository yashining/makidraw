# MakiDraw

A small drawing app, built one step at a time to learn web development.

Choose a line, rectangle, ellipse, or text from the toolbar. Draw geometric
shapes by clicking two points, or press, drag, and release. Select existing
shapes to move them or change their order. Completed drawings are encoded in
the URL, so refreshing or sharing the full URL recreates the drawing. A drawing
can also be made shareable for live cursors and scene updates between up to four
connected participants. The AI editor can apply a text instruction to the
current drawing.

Live app: <https://makidraw-production.up.railway.app/>

## Run locally

Use Node.js 22.12+ (Node 20.19+ also works) and npm.

Install the dependencies once:

```sh
npm install
```

Create a local `.env` file for the backend:

```sh
AI_ACCESS_TOKEN=your-secret-token
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.6-luna
```

Then run the backend in one terminal:

```sh
npm run dev:server
```

Run the frontend in another terminal:

```sh
npm run dev
```

Open the URL printed by Vite. Vite updates the page when frontend files change
and proxies `/api` requests to the Express server. Node's watch mode restarts
Express when backend files change. The Vite proxy supports both REST requests
and WebSocket connections. On the first AI edit, enter the same access token in
the browser; MakiDraw saves it in `sessionStorage` for that browser tab. The
`.env` file is ignored by Git and must not be committed.

## API

`GET /api/health` returns a small JSON response showing that the server is
running. The deployed endpoint is
<https://makidraw-production.up.railway.app/api/health>.

`POST /api/drawing/aiedit` accepts a prompt and the current versioned scene. It
requires the configured access token in an `Authorization: Bearer ...` header
and returns the complete edited scene.

The backend does not persist drawings. It only keeps active multiplayer rooms
and participants in memory while relaying messages between their WebSocket
connections.

## AI editing

The AI editor sends the user's instruction and complete current scene to the
Express backend. Each request is independent: prompt history is a browser UI
convenience and is not sent to the model as conversation context. Clicking a
history item restores that prompt to the editor, and refreshing the page clears
the history.

The backend validates the request with the shared Zod contract and sends it to
OpenAI with drawing-specific instructions. OpenAI Structured Outputs uses the
same `SceneV1Schema`, so the model must return a complete scene containing only
supported shapes, colors, coordinates, and text. The browser validates the API
response again before applying it.

An applied AI scene is a normal local commit: it enters undo history, updates
the drawing URL, renders immediately, and broadcasts to other participants when
multiplayer is active. If the returned scene is unchanged, the app reports that
there were no changes and does not create a commit.

`AI_ACCESS_TOKEN` is a simple shared gate for the public endpoint rather than a
user-account system. The browser asks for it when needed, stores it in
`sessionStorage` for the current tab, sends it as a bearer token, and removes it
after a `401` response. `OPENAI_API_KEY` remains on the server and is never sent
to browser code. Each model request can incur OpenAI API usage costs.

## Multiplayer

The sharing button creates a random room ID and adds it to the URL fragment.
Anyone opening the full URL joins the same room through
`/api/multiplayer?room=...`. The server assigns each connection a temporary
participant ID and relays cursor positions and validated scene updates to the
other participants in that room.

Every committed local drawing change sends the complete versioned scene. Other
clients apply it using last-write-wins behavior, update their URL, and retain it
in their local undo history. Remotely applied scenes are not broadcast again,
which prevents message loops.

Rooms support at most four participants and exist only in one running server
process. They disappear when empty or when the server restarts. The server does
not retain the latest scene, so a late participant starts with the drawing from
their URL and receives the current shared scene after another participant makes
a change. There is no conflict resolution for simultaneous edits yet.

## What each file does

- `index.html` defines the page content and loads the TypeScript entry point.
- `src/main.ts` coordinates drawing state and browser interactions.
- `src/ai-editor.ts` manages the AI prompt interface, access token, and API call.
- `src/canvas-renderer.ts` draws shapes and selection feedback on the canvas.
- `src/drawing-style.ts` stores shared visual settings for canvas drawings.
- `src/shape-geometry.ts` handles selecting and moving shapes.
- `src/drawing-url.ts` validates old URL formats and saves the current format.
- `src/multiplayer.ts` manages the browser WebSocket connection and messages.
- `src/style.css` controls the page's appearance.
- `server/index.ts` defines the Express API and serves the built frontend.
- `server/drawing-ai.ts` prompts OpenAI and validates its scene response.
- `server/multiplayer.ts` manages in-memory rooms and relays WebSocket messages.
- `server/tsconfig.json` configures TypeScript compilation for the backend.
- `shared/ai-edit-contract.ts` defines the browser/server AI edit contract.
- `shared/multiplayer-contract.ts` defines validated client and server messages.
- `shared/scene-contract.ts` defines points, shapes, and versioned scenes.
- `tsconfig.json` configures TypeScript checks for the frontend.
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
the `OPENAI_API_KEY` variable authorizes model requests. `OPENAI_MODEL` selects
the model and defaults to `gpt-5.6-luna`. Secrets must not use the `VITE_`
prefix, which would expose them to frontend code. Railway variable changes must
be deployed before the running service can read them.

GitHub Pages remains available as a frontend-only deployment at
<https://yashining.github.io/makidraw/>. Its GitHub Actions workflow uses
`npm run build:pages` so assets use the required `/makidraw/` URL prefix. AI
editing and multiplayer require the Railway backend and are not available on
the GitHub Pages deployment.
