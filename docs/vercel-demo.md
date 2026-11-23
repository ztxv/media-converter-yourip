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

Use the repository `ztxv/media-converter-yourip` and set these in **Project Settings**:

| Setting | Value |
| --- | --- |
| Root Directory | `yourip-frontend` |
| Framework Preset | Next.js (detected automatically) |
| Build Command | leave default, `vercel.json` sets `npm run build:demo` |
| Install Command | leave default, `vercel.json` sets `npm ci` |
| Output Directory | leave default, `vercel.json` sets `out` |
| Node.js Version | 22.x |
| Environment Variables | none required |

`Root Directory = yourip-frontend` is the most robust option: the build only sees the frontend and its lockfile, and the `vercel.json` in that folder is picked up. It also means Vercel never installs or runs anything from `yourip-backend/`. A repo-root alternative (a root `vercel.json` with `installCommand: "npm --prefix yourip-frontend ci"` and `outputDirectory: "yourip-frontend/out"`) works too but needs more settings to stay correct, so it is not used here.

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
