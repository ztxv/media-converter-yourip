# YouRip

A local web app for saving YouTube videos as MP3 audio or MP4 video. Paste a link, choose a format and quality, watch download progress, and save the finished file from your browser.

Built with Next.js, React, FastAPI, yt-dlp, and FFmpeg. The interface and converter run on your own computer.

## Quick start

Install the prerequisites once, download or clone this repository, then run this command **inside the `YT2MP3` project folder**:

```sh
npm start
```

The launcher creates an isolated Python environment, installs the project dependencies on first launch, and starts both servers. Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** when the terminal says YouRip is ready. If that port is busy, the launcher selects another available port—use the link printed in your terminal.

Press **Ctrl+C** in that terminal to stop both servers. Future launches use the same command and reuse installed dependencies. An internet connection is required for initial setup and YouTube downloads.

### macOS

Install [Homebrew](https://brew.sh/) if needed, then:

```sh
brew install node python ffmpeg
```

For this checkout on a Mac, navigate to the project folder before starting:

```sh
cd "/path/to/yourip.me/YT2MP3"
npm start
```

Replace the example path with the location where you saved the project. No Python environment activation or second terminal is required.

### Windows

Install Node.js 22 or newer, Python 3.10 or newer, and FFmpeg. With Windows Package Manager:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.13 -e
winget install --id Gyan.FFmpeg -e
```

Reopen PowerShell after installation, navigate to the project folder, and run `npm start`. The launcher supports the Windows Python launcher (`py`) as well as `python`.

### Linux

Install Node.js 22 or newer, Python 3.10 or newer with its `venv` support, and FFmpeg using your distribution's packages or the projects' official installers. Then run `npm start` from the project folder.

## Features

- Convert a single YouTube video to MP3 or MP4, including short links and Shorts links.
- Choose MP3 bitrate (128, 192, or 320 kbps) or an MP4 resolution cap (480p, 720p, or 1080p).
- See actual transfer progress while yt-dlp downloads each media stream; post-processing shows a separate preparation state.
- Queue up to five waiting videos while a conversion runs.
- Drag links onto the page, or paste into the input and select **Convert**.
- See titles and thumbnails when YouTube metadata is available.
- Enable automatic downloads and choose an accent color in Settings.
- Download recent results again during the current session.

Recent downloads are kept in browser memory, with a limit of ten results and a 300 MB budget for older results. Refreshing the page clears the queue, history, and settings. Playlist downloads and saved libraries are not implemented. Output quality depends on what the source video provides.

## Updating the downloader

YouTube changes regularly. If previously working videos stop converting, stop the app and run:

```sh
npm run update:downloader
npm start
```

This updates yt-dlp and its supporting packages inside the project's Python environment. It does not change your system Python packages.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| `npm` is not found | Install Node.js 22 or newer and reopen the terminal. |
| Python is missing or too old | Install Python 3.10 or newer. On macOS, run `brew install python`. |
| FFmpeg is missing | Install FFmpeg and reopen the terminal so it is available on your PATH. |
| The app opens on a different port | Another app is using the usual port. Open the exact link printed by the launcher. |
| Conversion fails | Read the converter error in the terminal, try a public video, and update the downloader. Private, age-restricted, region-restricted, and sign-in-required videos may not work. |
| A long video fails | Downloads are limited to 250 MB where the source reports its size; conversions time out after ten minutes. Try a shorter video. |
| Dependencies need a fresh install | Stop the app, delete `.venv` and `.local-state` from the project folder, then run `npm start`. |

## Development

```sh
npm start                  # Install dependencies if needed and run both servers
npm run check              # TypeScript and ESLint checks (after initial setup)
npm test                   # Run converter regression tests (after initial setup)
npm run build              # Verify the frontend production build
npm run update:downloader  # Update the YouTube extraction engine
```

The local launcher binds both services to `127.0.0.1`. Next.js serves the interface on port 3000 and forwards conversion requests to FastAPI on port 8000 by default; occupied ports are skipped automatically. The browser uses the same origin for API calls, so no private IP address or CORS configuration is required.

The backend reports download-job progress, streams the finished MP3 or MP4, and removes its temporary files after delivery. It uses the project's Python environment for yt-dlp and the installed Node.js runtime for YouTube's JavaScript challenges. Fonts are local system fonts, so building the interface does not fetch Google Fonts.

```text
YT2MP3/
├── scripts/dev.mjs       # Setup, startup, readiness checks, and shutdown
├── yourip-frontend/      # Next.js interface and API forwarding
├── yourip-backend/       # FastAPI converter and Python dependencies
├── package.json         # Commands run from the project root
└── README.md
```

Use YouRip for content you own or have permission to download.

Interface assets use [Lucide icons](https://lucide.dev/) (ISC), [shadcn/ui components](https://ui.shadcn.com/) (MIT) built on [Radix Primitives](https://www.radix-ui.com/primitives) (MIT), and [Motion for React](https://motion.dev/docs/react) (MIT).
