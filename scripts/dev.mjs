#!/usr/bin/env node
/**
 * Development entry point: runs the AI model album watcher next to `ng serve`.
 *
 * New photographs dropped into `public/NeverBeenModels/<ModelName>/` are picked up by the watcher,
 * which regenerates the manifest; the Angular dev server then rebuilds and reloads the page. Nothing
 * else has to be run or edited.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);

let ngEntry;
try {
  ngEntry = require.resolve('@angular/cli/bin/ng.js');
} catch {
  console.error('[dev] Could not find the Angular CLI. Run `npm install` first.');
  process.exit(1);
}

const watcher = spawn(process.execPath, ['scripts/watch-ai-models.mjs'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

// Local stand-in for the Worker's booking endpoint; the dev server proxies /api/* to it.
const bookingApi = spawn(process.execPath, ['scripts/dev-booking-api.mjs'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

const server = spawn(process.execPath, [ngEntry, 'serve', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  watcher.kill('SIGTERM');
  bookingApi.kill('SIGTERM');
  server.kill('SIGTERM');
  process.exitCode = code;
}

server.on('exit', (code, signal) => shutdown(signal ? 0 : (code ?? 0)));
server.on('error', (error) => {
  console.error(`[dev] Could not start the dev server: ${error.message}`);
  shutdown(1);
});
bookingApi.on('exit', (code) => {
  if (!stopping && code) console.warn(`[ai-models] The local booking API stopped (exit ${code}).`);
});
watcher.on('exit', (code) => {
  if (!stopping && code) console.warn(`[ai-models] The album watcher stopped (exit ${code}).`);
});
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
