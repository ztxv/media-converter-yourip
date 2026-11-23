# Hosting the simulated demo on Vercel

The live demo is the real YouRip interface with a **simulated** converter. It must never download, convert, or process real media, and it is built so it cannot.

## How the separation works

| Layer | What it does |
| --- | --- |
| Static export | With `NEXT_PUBLIC_YOURIP_DEMO=true`, `next.config.ts` sets `output: "export"`. The result (`yourip-frontend/out/`) is plain HTML, JS, and CSS. There is no server runtime to run anything. |
| Routes excluded | The same config sets `pageExtensions` without `ts`, so Next ignores every `route.ts`. The four API route handlers (metadata, jobs, job status, job file) are not compiled in the demo build. |
| Swappable API layer | `src/lib/converter-api.select.ts` picks the simulator (`converter-api.demo.ts`) or the real client (`converter-api.live.ts`) at build time. The bundler removes the unused module, so the demo bundle has no real `fetch` calls and the normal bundle has no simulator. |
| No file ever | In demo mode the Download controls only show a message; the code that creates a download link is removed from the bundle. |
| Build gate | `npm run build:demo` ends with `scripts/verify-demo-build.mjs`. It fails the build if `out/` contains API routes, non-static files, or any reference to yt-dlp, FFmpeg, FastAPI, the backend URL variable, `/api/jobs`, `/api/metadata`, YouTube's oEmbed endpoint, YouTube image hosts, or blob-download code. It also fails if the demo bundle is missing, so the wrong build can't pass. |
| Pinned Vercel config | `yourip-frontend/vercel.json` pins the build command to `npm run build:demo`, so a forgotten dashboard setting cannot deploy the real app. |

The backend lives in `yourip-backend/` and is not part of the Next build at all.

## Vercel settings

Two setups work. Both pin the demo build, so the real app can't be deployed by accident.

**A. Drag and drop, or deploy the whole repo (root `vercel.json`).** Drop the repository folder (the one containing `yourip-frontend`, `yourip-backend`, and `package.json`) onto Vercel, or import the GitHub repo with Root Directory left blank. The root `vercel.json` sets:

| Setting | Value |
| --- | --- |
| Install Command | `npm --prefix yourip-frontend ci` |
| Build Command | `npm run build:demo` |
| Output Directory | `yourip-frontend/out` |
| Framework Preset | Other (`"framework": null`) |

**B. Deploy only the frontend (`yourip-frontend/vercel.json`).** Drop the `yourip-frontend` folder itself, or import the repo with **Root Directory = `yourip-frontend`**. That folder's `vercel.json` sets the Next.js preset, `npm ci`, `npm run build:demo`, and `out`.

In both cases set **Node.js Version** to 22.x and leave Environment Variables empty. Before dragging a folder you've used locally, delete `node_modules`, `.next`, and `out` from it (Vercel installs its own dependencies, and uploading them is slow).

Setup B only builds the frontend. Setup A uploads the backend source too, but nothing builds or runs it, and the verifier fails the build if anything from it ends up in the output.

Do **not** set `YOURIP_BACKEND_URL` on this project. It is not used by the demo build, and the verifier fails the build if it appears in the output.

After the first deploy, put the production URL in the README (see the badge comment near the top) and, if you like, the repository's website field.

## Run it locally

```sh
npm run dev:demo      # from the repository root; http://127.0.0.1:3000
npm run build:demo    # build + verify; serve yourip-frontend/out with any static server
```

Switching between the demo and the normal app in the same checkout reuses the `.next` folder; if the two modes seem to mix, stop the dev server and delete `yourip-frontend/.next`.

## Sample links in the demo

The banner area offers four fictional sample links (`demoSynth01`, `demoRain001`, `demoCoffee1`, `demoGone001`). Titles are made up and thumbnails are local SVGs in `public/demo/`; nothing is fetched from YouTube. Any other valid-looking YouTube link gets a generic "Sample video" result. `demoGone001` simulates a failing job. Invalid links show the same messages as the real app.

## Changing the simulator

Timings live in `timeline()` in `src/lib/converter-api.demo.ts` (MP3 and MP4 differ, and higher quality takes longer; MP4 shows a video then an audio pass like the real converter). Keep the literal `process.env.NEXT_PUBLIC_YOURIP_DEMO === "true"` in `converter-api.select.ts` and `page.tsx`: the bundler only folds it where it is written out, and the verifier will fail the build if that regresses.
