# MakiDraw

A small drawing app, built one step at a time to learn web development.
Choose a line, rectangle, or ellipse from the toolbar. Click once on the canvas
to choose the first point, then click again to choose the opposite corner or
line endpoint. The unfinished shape follows the cursor between clicks.
Completed shapes are encoded in the URL, so refreshing or sharing the full URL
recreates the drawing.

## Run locally

Use Node.js 22.12+ (Node 20.19+ also works) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. Editing a file updates the page.

## What each file does

- `index.html` defines the page content and loads the TypeScript entry point.
- `src/main.ts` stores shapes, redraws the canvas, and syncs shapes to the URL.
- `src/style.css` controls the page's appearance.
- `package.json` lists the development tools and commands.
- `package-lock.json` records exact dependency versions for repeatable installs.
- `tsconfig.json` configures TypeScript's checks.
- `vite.config.ts` sets the `/makidraw/` URL prefix used by GitHub Pages.
- `.github/workflows/deploy.yml` tells GitHub how to build and publish the site.

## Build and preview

```sh
npm run build
npm run preview
```

The build first checks TypeScript, then Vite creates browser-ready files in
`dist/`. The preview command serves those files locally. `dist/` and
`node_modules/` are generated, so they are excluded from Git.

## Deployment

The public repository is intended to be `yashining/makidraw`, with the site at
<https://yashining.github.io/makidraw/> once the first deployment succeeds.

In the GitHub repository, select **Settings → Pages → Build and deployment →
Source → GitHub Actions**. Each push to `main` then installs the locked
dependencies with `npm ci`, builds the site, and publishes `dist/`.
The repository's **Actions** tab shows the progress and any errors.
You can also start a deployment manually with **Run workflow**.

Try changing the stroke color or line width in `src/main.ts`, check it locally,
then commit and push it to see the same change online.
