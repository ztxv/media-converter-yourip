// Fails if the demo build output could reach a real converter. Run automatically by `npm run build:demo`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(frontend, 'out');
const failures = [];

if (!existsSync(join(out, 'index.html'))) {
  console.error('verify-demo-build: out/index.html is missing. Was this a demo build (NEXT_PUBLIC_YOURIP_DEMO=true)?');
  process.exit(1);
}

// 1. The deployable directory must be static assets only: no server code or API route output.
const allowed = new Set(['.html', '.js', '.css', '.txt', '.ico', '.svg', '.png', '.json', '.map', '.woff', '.woff2']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path); else files.push(path);
  }
})(out);
for (const file of files) {
  const rel = relative(out, file).replaceAll('\\', '/');
  if (rel === 'api' || rel.startsWith('api/') || /(^|\/)route\.(js|ts)$/.test(rel)) failures.push(`API route output present: ${rel}`);
  const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
  if (!allowed.has(ext)) failures.push(`unexpected file type in out/: ${rel}`);
}

// 2. Nothing in the output may mention the real converter, its tools, or live endpoints.
const forbidden = [
  [/yt-?dlp|yt_dlp/i, 'yt-dlp'],
  [/ffmpeg/i, 'FFmpeg'],
  [/fastapi|uvicorn/i, 'FastAPI/uvicorn'],
  [/YOURIP_BACKEND_URL/, 'backend URL variable'],
  [/127\.0\.0\.1:8000|localhost:8000/, 'local backend address'],
  [/youtube\.com\/oembed/i, 'YouTube oEmbed endpoint'],
  [/\/api\/(jobs|metadata)/, 'converter API path'],
  [/i\.ytimg\.com|img\.youtube\.com/i, 'YouTube image host'],
];
const text = new Set(['.html', '.js', '.css', '.txt', '.json', '.svg']);
for (const file of files) {
  const rel = relative(out, file).replaceAll('\\', '/');
  if (!text.has(rel.slice(rel.lastIndexOf('.')).toLowerCase())) continue;
  const content = readFileSync(file, 'utf8');
  for (const [pattern, label] of forbidden) if (pattern.test(content)) failures.push(`${label} found in out/${rel}`);
}

// Blob download code must be absent from the app's own chunks (Next's polyfills legitimately mention createObjectURL).
for (const file of files.filter(f => /[\\/]chunks[\\/]app[\\/].*\.js$/.test(f)))
  if (/createObjectURL/.test(readFileSync(file, 'utf8'))) failures.push(`blob download code found in out/${relative(out, file).replaceAll('\\', '/')}`);

// 3. The simulator must actually be in the bundle (guards against shipping the wrong build).
const bundle = files.filter(f => f.endsWith('.js')).map(f => readFileSync(f, 'utf8')).join('\n');
if (!bundle.includes('Demo: no file is created')) failures.push('demo download message not found; this does not look like the demo bundle');

if (failures.length) {
  console.error('\nverify-demo-build FAILED:\n' + failures.map(f => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`\nverify-demo-build passed: ${files.length} static files in out/, no converter code, endpoints or tools referenced.`);
