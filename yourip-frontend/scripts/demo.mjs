// Runs the simulated YouRip demo: `node scripts/demo.mjs dev` or `node scripts/demo.mjs build`.
// Setting the flag here (instead of in the shell) keeps the commands identical on macOS, Linux and Windows.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = dirname(dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2];
if (!['dev', 'build'].includes(mode)) { console.error('Usage: node scripts/demo.mjs <dev|build>'); process.exit(2); }

const env = { ...process.env, NEXT_PUBLIC_YOURIP_DEMO: 'true', NEXT_TELEMETRY_DISABLED: '1' };
const next = join(frontend, 'node_modules', 'next', 'dist', 'bin', 'next');
const args = mode === 'dev' ? [next, 'dev', '--hostname', '127.0.0.1'] : [next, 'build'];
const run = spawnSync(process.execPath, args, { cwd: frontend, env, stdio: 'inherit' });
if (run.status !== 0) process.exit(run.status ?? 1);

if (mode === 'build') {
  // A demo build that contains anything from the real converter is a failed build.
  const verify = spawnSync(process.execPath, [join(frontend, 'scripts', 'verify-demo-build.mjs')], { cwd: frontend, stdio: 'inherit' });
  process.exit(verify.status ?? 1);
}
