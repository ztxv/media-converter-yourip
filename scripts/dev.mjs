import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const frontend = join(root, 'yourip-frontend');
const backend = join(root, 'yourip-backend');
const state = join(root, '.local-state');
const win = process.platform === 'win32';
const python = join(root, '.venv', win ? 'Scripts/python.exe' : 'bin/python');
const children = new Set();
let stopping = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', detached: !win, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, ...options });
    children.add(child);
    child.on('error', error => { children.delete(child); reject(error); });
    child.on('exit', code => {
      children.delete(child);
      code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (win) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function digest(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function installed(name, hash) {
  const file = join(state, name);
  return existsSync(file) && readFileSync(file, 'utf8') === hash;
}
async function availablePort(preferred) {
  for (let port = preferred; port < preferred + 20; port++) {
    const free = await new Promise(resolve => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw new Error(`No available local port near ${preferred}. Stop an earlier app instance and retry.`);
}
async function ready(url) {
  for (let i = 0; i < 90; i++) {
    if (stopping) throw new Error('Startup stopped.');
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`The app did not become ready at ${url}. Check the errors above.`);
}
async function main() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Install Node.js 22 or newer.');
  mkdirSync(state, { recursive: true });
  if (!existsSync(python)) {
    const candidates = win ? [['py', ['-3']], ['python', []]] : ['python3', 'python3.14', 'python3.13', 'python3.12', 'python3.11', 'python3.10'].map(cmd => [cmd, []]);
    const found = candidates.find(([cmd, args]) => spawnSync(cmd, [...args, '-c', 'import sys; sys.exit(sys.version_info < (3, 10))'], { stdio: 'ignore' }).status === 0);
    if (!found) throw new Error('Install Python 3.10 or newer (macOS: brew install python).');
    console.log('\nCreating the local Python environment…');
    await run(found[0], [...found[1], '-m', 'venv', join(root, '.venv')]);
  }
  const requirements = join(backend, 'requirements.txt');
  if (process.argv.includes('--update-downloader')) {
    await run(python, ['-m', 'pip', 'install', '--upgrade', 'yt-dlp[default]']);
    console.log('\nDownloader updated. Start the app with npm start.');
    return;
  }
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) throw new Error('FFmpeg is required. macOS: brew install ffmpeg. Windows: winget install --id Gyan.FFmpeg -e (then reopen the terminal).');
  const pyHash = digest(requirements);
  if (!installed('python-dependencies', pyHash) || spawnSync(python, ['-c', 'import fastapi, uvicorn, yt_dlp'], { stdio: 'ignore', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }).status !== 0) {
    console.log('\nInstalling converter dependencies…');
    await run(python, ['-m', 'pip', 'install', '-r', requirements]);
    writeFileSync(join(state, 'python-dependencies'), pyHash);
  }
  const jsHash = digest(join(frontend, 'package-lock.json'));
  if (!existsSync(join(frontend, 'node_modules', 'next')) || !installed('frontend-dependencies', jsHash)) {
    console.log('\nInstalling interface dependencies…');
    // npm supplies its own CLI path on macOS, Linux, and Windows.
    await run(process.execPath, [process.env.npm_execpath, 'ci', '--no-fund', '--no-audit'], { cwd: frontend });
    writeFileSync(join(state, 'frontend-dependencies'), jsHash);
  }
  const [frontendPort, backendPort] = await Promise.all([availablePort(3000), availablePort(8000)]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  run(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(backendPort)], { cwd: backend })
    .then(() => stop(), error => { if (!stopping) console.error(error.message); stop(1); });
  await ready(`${backendUrl}/api/health`);
  run(process.execPath, [join(frontend, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', '127.0.0.1', '--port', String(frontendPort)], { cwd: frontend, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', YOURIP_BACKEND_URL: backendUrl } })
    .then(() => stop(), error => { if (!stopping) console.error(error.message); stop(1); });
  await ready(frontendUrl);
  console.log(`\nYouRip is ready: ${frontendUrl}\nPress Ctrl+C to stop both servers.\n`);
}
main().catch(error => { console.error(`\nYouRip: ${error.message}\n`); stop(1); });
