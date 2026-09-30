import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const python = join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) {
  console.error('Run npm start once to install the project dependencies, then retry npm test.');
  process.exit(1);
}
const result = spawnSync(python, ['-m', 'unittest', 'discover', '-s', 'yourip-backend/tests', '-v'], { cwd: root, stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
process.exit(result.status ?? 1);
